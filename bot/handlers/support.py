"""SOULDAWN — Support handlers: AI assistant, operator, two-way support flow."""
from __future__ import annotations

import logging

from aiogram import Router, F, Bot
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, InputMediaPhoto,
)
from aiogram.fsm.context import FSMContext

from config import ADMIN_IDS
from database import (
    get_or_create_user, create_ticket, update_ticket_admin_messages,
    append_ticket_message, get_open_ticket_by_user,
)
from utils import BANNERS

from texts import (
    ai_ask_text, ai_answer, ai_handoff, operator_ask,
    confirm_send, sent_ok, sent_fail, offline,
)
from keyboards import main_kb, back_kb, operator_confirm_kb, ai_helpful_kb, support_kb
from services.ai import ask_ai
from states.support_states import OperatorState, AIState, SupportStates

router = Router()
logger = logging.getLogger("SOULDAWN")


async def _edit(callback, banner_type: str, caption: str, kb=None) -> None:
    try:
        await callback.message.edit_media(
            InputMediaPhoto(media=BANNERS[banner_type], caption=caption),
            reply_markup=kb,
        )
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer_photo(
            photo=BANNERS[banner_type], caption=caption, reply_markup=kb,
        )


# ── AI entry ──
@router.callback_query(F.data == "ai:ask")
async def on_ai_ask(callback: CallbackQuery, state: FSMContext):
    await state.set_state(AIState.waiting_question)
    await _edit(callback, "ai", ai_ask_text(), back_kb())
    await callback.answer()


@router.callback_query(F.data == "ai:thanks")
async def on_ai_thanks(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await _edit(callback, "welcome", "Рад помочь!\n\nЗадай ещё вопрос или выбери раздел", main_kb())
    await callback.answer()


# ── Operator entry ──
@router.callback_query(F.data == "operator")
async def on_operator(callback: CallbackQuery, state: FSMContext):
    await state.set_state(OperatorState.waiting_message)
    await _edit(callback, "operator", operator_ask(), back_kb())
    await callback.answer()


# ── FSM: user message to operator ──
@router.message(OperatorState.waiting_message)
async def handle_op_msg(message: Message, state: FSMContext):
    text = message.text or ""
    if not text.strip():
        await message.answer("Напиши текст")
        return
    await state.update_data(pending_text=text)
    await state.set_state(OperatorState.confirm_send)
    await message.answer_photo(
        photo=BANNERS["confirm"],
        caption=confirm_send(text),
        reply_markup=operator_confirm_kb(),
    )


# ── FSM: AI question ──
@router.message(AIState.waiting_question)
async def handle_ai_q(message: Message, state: FSMContext, bot: Bot):
    text = (message.text or "").strip()
    if not text:
        await message.answer("Напиши вопрос")
        return
    await bot.send_chat_action(message.chat.id, "typing")
    resp = await ask_ai(text)
    if resp.strip().upper() == "HANDOFF":
        await state.set_state(OperatorState.waiting_message)
        await state.update_data(pending_text=text)
        await message.answer_photo(
            photo=BANNERS["operator"],
            caption=ai_handoff(text),
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="💬  Оператор", callback_data="operator")],
                [InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")],
            ]),
        )
        return
    await state.set_state(AIState.waiting_choice)
    await message.answer_photo(
        photo=BANNERS["ai"],
        caption=ai_answer(text, resp),
        reply_markup=ai_helpful_kb(),
    )


# ── Confirm send to operator ──
@router.callback_query(F.data == "confirm_operator", OperatorState.confirm_send)
async def on_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot):
    data = await state.get_data()
    user_text = data.get("pending_text", "")
    await state.clear()
    user = callback.from_user
    name = user.first_name or user.username or str(user.id)
    uname = f"@{user.username}" if user.username else "—"

    if ADMIN_IDS:
        try:
            # Build formatted original_text for ticket storage
            original_text = (
                f"📩 Новое обращение\n\n"
                f"👤 {name} · ID: {user.id} · {uname}\n\n"
                f"📝 Сообщение:\n«{user_text[:500]}»"
            )

            logger.info(f"Creating ticket for user={user.id}, text_len={len(user_text)}")

            # Step 1: Create ticket in DB first (get real ticket_id)
            ticket = await create_ticket(user.id, [], original_text)
            ticket_id = ticket.get("id", "")

            if not ticket_id:
                logger.error(f"create_ticket returned empty id! ticket={ticket}")
                await _edit(callback, "sent_fail", sent_fail(), main_kb())
                await callback.answer()
                return

            logger.info(f"Ticket created: {ticket_id[:8]}, sending to {len(ADMIN_IDS)} admins")

            # Step 2: Send messages to admins with real ticket_id in callback_data
            admin_messages = []
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📥 Взять в работу", callback_data=f"take_ticket:{ticket_id}")]
            ])
            for admin_id in ADMIN_IDS:
                try:
                    sent_msg = await bot.send_message(admin_id, original_text, reply_markup=kb)
                    admin_messages.append({"admin_id": admin_id, "message_id": sent_msg.message_id})
                    logger.info(f"Ticket sent to admin {admin_id}: msg_id={sent_msg.message_id}")
                except Exception as send_err:
                    logger.error(f"Failed to send ticket to admin {admin_id}: {send_err}")

            # Step 3: Update ticket with admin_messages
            if admin_messages:
                await update_ticket_admin_messages(ticket_id, admin_messages)

            logger.info(f"Ticket {ticket_id[:8]} delivered to {len(admin_messages)}/{len(ADMIN_IDS)} admins")
            await _edit(callback, "sent_ok", sent_ok(), main_kb())
        except Exception as e:
            logger.error(f"Error forwarding support request: {e}")
            import traceback
            traceback.print_exc()
            await _edit(callback, "sent_fail", sent_fail(), main_kb())
    else:
        await _edit(callback, "offline", offline(), main_kb())
    await callback.answer()


# ── Two-way support: "Поддержка" button ──
@router.callback_query(F.data == "support")
async def on_support(callback: CallbackQuery, state: FSMContext):
    await state.set_state(SupportStates.waiting_for_message)
    try:
        await callback.message.edit_media(
            InputMediaPhoto(
                media=BANNERS["operator"],
                caption=(
                    "Напиши свой вопрос, и оператор ответит тебе.\n\n"
                    "Можно отправить текст, фото или документ."
                ),
            ),
            reply_markup=back_kb(),
        )
    except Exception:
        await callback.message.answer_photo(
            photo=BANNERS["operator"],
            caption=(
                "Напиши свой вопрос, и оператор ответит тебе.\n\n"
                "Можно отправить текст, фото или документ."
            ),
            reply_markup=back_kb(),
        )
    await callback.answer()


# ── Two-way support: catch user message → forward to all admins ──
@router.message(SupportStates.waiting_for_message)
async def handle_support_msg(message: Message, state: FSMContext, bot: Bot):
    user = message.from_user
    name = user.first_name or user.username or str(user.id)
    uname = f"@{user.username}" if user.username else "—"

    if not ADMIN_IDS:
        await message.answer_photo(
            photo=BANNERS["offline"],
            caption=offline(),
            reply_markup=main_kb(),
        )
        await state.clear()
        return

    try:
        user_text = message.text or message.caption or ""

        # Check if user already has an open ticket — append instead of creating new
        existing_ticket = await get_open_ticket_by_user(user.id)

        if existing_ticket:
            ticket_id = existing_ticket["id"]
            # Persist the new message in the ticket history
            await append_ticket_message(ticket_id, "user", user_text)

            # Notify the admin who accepted the ticket (if any)
            accepted_by = existing_ticket.get("accepted_by")
            if accepted_by:
                try:
                    await bot.send_message(
                        accepted_by,
                        f"💬 Новое сообщение от {name} (тикет #{ticket_id[:8]}):\n\n«{user_text[:500]}»",
                    )
                except Exception as notify_err:
                    logger.warning(f"Could not notify admin {accepted_by}: {notify_err}")

            logger.info(f"Appended message to existing ticket {ticket_id[:8]}: user={user.id}")
        else:
            # Build formatted original_text for ticket storage
            original_text = (
                f"📩 Обращение в поддержку\n\n"
                f"👤 {name} · ID: {user.id} · {uname}\n\n"
                f"📝 Сообщение:\n«{user_text[:500]}»"
            )

            # Step 1: Create ticket in DB first (get real ticket_id)
            ticket = await create_ticket(user.id, [], original_text)
            ticket_id = ticket.get("id", "")

            if not ticket_id:
                logger.error("create_ticket returned empty id (support_msg)")
                await message.answer("Не удалось создать тикет. Попробуй позже.")
                await state.clear()
                return

            # Persist first message in history
            await append_ticket_message(ticket_id, "user", user_text)

            # Step 2: Send messages to admins with real ticket_id in callback_data
            admin_messages = []
            kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="📥 Взять в работу", callback_data=f"take_ticket:{ticket_id}")]
            ])
            for admin_id in ADMIN_IDS:
                try:
                    sent_msg = await bot.send_message(
                        chat_id=admin_id,
                        text=original_text,
                        reply_markup=kb,
                    )
                    admin_messages.append({"admin_id": admin_id, "message_id": sent_msg.message_id})
                except Exception as send_err:
                    logger.error(f"Failed to send ticket to admin {admin_id}: {send_err}")

            # Step 3: Update ticket with admin_messages
            await update_ticket_admin_messages(ticket_id, admin_messages)

            logger.info(f"Support msg forwarded to {len(admin_messages)} admins: user={user.id}, ticket={ticket_id[:8]}")

    except Exception as e:
        logger.error(f"Error forwarding support message: {e}")
        import traceback
        traceback.print_exc()
        await message.answer("Не удалось отправить сообщение. Попробуй позже.")
        await state.clear()
        return

    await state.clear()
    await message.answer(
        "✅ Сообщение отправлено оператору.\n"
        "Ожидай ответ — он придёт сюда.",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="← Назад", callback_data="back_to_menu")],
        ]),
    )
