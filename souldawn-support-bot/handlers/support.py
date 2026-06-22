"""SOULDAWN Support Bot — полноценная система тикетов."""
from __future__ import annotations

import logging

from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    Message, CallbackQuery,
    InlineKeyboardButton, InlineKeyboardMarkup,
)

from config import ADMIN_IDS
from database import (
    get_or_create_user, create_ticket,
    update_ticket_admin_messages,
)
from states.support_states import NewTicketStates

router = Router()
logger = logging.getLogger("SOULDAWN.support")

STATUS_LABELS = {
    "open":        "🟡 Открыто",
    "in_progress": "🔵 В работе",
    "answered":    "✅ Отвечено",
    "closed":      "⬛ Закрыто",
}

CATEGORY_LABELS = {
    "question": "❓ Вопрос",
    "return":   "📦 Возврат товара",
    "other":    "💬 Другое",
}


def main_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️  Создать обращение", callback_data="new_ticket")],
        [InlineKeyboardButton(text="📋  Мои обращения",     callback_data="my_tickets")],
    ])


def category_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❓  Вопрос",         callback_data="cat:question")],
        [InlineKeyboardButton(text="📦  Возврат товара", callback_data="cat:return")],
        [InlineKeyboardButton(text="💬  Другое",         callback_data="cat:other")],
        [InlineKeyboardButton(text="← Назад",            callback_data="back_to_menu")],
    ])


def confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅  Отправить", callback_data="confirm_ticket")],
        [InlineKeyboardButton(text="✏️  Изменить", callback_data="edit_ticket")],
        [InlineKeyboardButton(text="❌  Отменить", callback_data="cancel_ticket")],
    ])


def back_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="← Назад", callback_data="back_to_menu")],
    ])


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    user = message.from_user
    if user:
        await get_or_create_user(user.id, user.username or "", user.first_name or "")
    name = (user.first_name or "друг") if user else "друг"
    await message.answer(
        f"👋 Привет, {name}!\n\n"
        f"Ты в официальном боте техподдержки бренда одежды "
        f"<b>SOULDAWN</b> — Рассвет после боя.\n\n"
        f"Здесь ты можешь создать обращение и получить ответ от нашей команды.\n\n"
        f"Выбери действие:",
        parse_mode="HTML",
        reply_markup=main_kb(),
    )


@router.message(Command("tickets"))
async def cmd_tickets(message: Message):
    await show_my_tickets(message)


@router.message(Command("new"))
async def cmd_new(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Выбери категорию обращения:", reply_markup=category_kb())
    await state.set_state(NewTicketStates.choosing_category)


@router.callback_query(F.data == "back_to_menu")
async def on_back(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text("Главное меню — выбери действие:", reply_markup=main_kb())
    await callback.answer()


@router.callback_query(F.data == "new_ticket")
async def on_new_ticket(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text("Выбери категорию обращения:", reply_markup=category_kb())
    await state.set_state(NewTicketStates.choosing_category)
    await callback.answer()


@router.callback_query(F.data.startswith("cat:"), NewTicketStates.choosing_category)
async def on_category(callback: CallbackQuery, state: FSMContext):
    cat = callback.data.split(":", 1)[1]
    label = CATEGORY_LABELS.get(cat, cat)
    await state.update_data(category=cat, category_label=label)
    await state.set_state(NewTicketStates.waiting_message)
    await callback.message.edit_text(
        f"Категория: <b>{label}</b>\n\n"
        f"Опиши свой вопрос подробно. "
        f"Когда будешь готов — нажми <b>Отправить</b>.",
        parse_mode="HTML",
        reply_markup=back_kb(),
    )
    await callback.answer()


@router.message(NewTicketStates.waiting_message)
async def on_ticket_text(message: Message, state: FSMContext):
    text = (message.text or message.caption or "").strip()
    if not text:
        await message.answer("Пожалуйста, напиши текст обращения.")
        return
    data = await state.get_data()
    category_label = data.get("category_label", "Другое")
    await state.update_data(ticket_text=text)
    await state.set_state(NewTicketStates.confirm)
    preview = text[:300] + ("..." if len(text) > 300 else "")
    await message.answer(
        f"📋 <b>Проверь обращение перед отправкой:</b>\n\n"
        f"Категория: <b>{category_label}</b>\n\n"
        f"Текст:\n<i>{preview}</i>\n\n"
        f"Всё верно?",
        parse_mode="HTML",
        reply_markup=confirm_kb(),
    )


@router.callback_query(F.data == "edit_ticket", NewTicketStates.confirm)
async def on_edit(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    label = data.get("category_label", "Другое")
    await state.set_state(NewTicketStates.waiting_message)
    await callback.message.edit_text(
        f"Категория: <b>{label}</b>\n\nНапиши новый текст:",
        parse_mode="HTML", reply_markup=back_kb(),
    )
    await callback.answer()


@router.callback_query(F.data == "cancel_ticket")
async def on_cancel(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text("❌ Обращение отменено.\n\nГлавное меню:", reply_markup=main_kb())
    await callback.answer()


@router.callback_query(F.data == "confirm_ticket", NewTicketStates.confirm)
async def on_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()
    user           = callback.from_user
    name           = user.first_name or user.username or str(user.id)
    uname          = f"@{user.username}" if user.username else "—"
    category_label = data.get("category_label", "Другое")
    ticket_text    = data.get("ticket_text", "")

    original_text = (
        f"📩 Новое обращение\n\n"
        f"👤 {name} · ID: {user.id} · {uname}\n"
        f"🏷 Категория: {category_label}\n\n"
        f"📝 Сообщение:\n«{ticket_text[:500]}»"
    )

    try:
        ticket    = await create_ticket(user.id, [], original_text)
        ticket_id = ticket.get("id", "")
        if not ticket_id:
            await callback.message.edit_text("❌ Не удалось создать обращение. Попробуй позже.", reply_markup=main_kb())
            await callback.answer()
            return

        admin_messages = []
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📥 Взять в работу", callback_data=f"take_ticket:{ticket_id}")]
        ])
        for admin_id in ADMIN_IDS:
            try:
                sent = await bot.send_message(admin_id, original_text, reply_markup=kb)
                admin_messages.append({"admin_id": admin_id, "message_id": sent.message_id})
            except Exception as e:
                logger.error(f"Failed to notify admin {admin_id}: {e}")

        if admin_messages:
            await update_ticket_admin_messages(ticket_id, admin_messages)

        short_id = ticket_id[:8].upper()
        await callback.message.edit_text(
            f"✅ <b>Обращение #{short_id} создано!</b>\n\n"
            f"Категория: {category_label}\n"
            f"Наша команда ответит в ближайшее время.\n\n"
            f"Посмотреть статус: /tickets",
            parse_mode="HTML", reply_markup=main_kb(),
        )
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        await callback.message.edit_text("❌ Ошибка. Попробуй позже.", reply_markup=main_kb())
    await callback.answer()


@router.callback_query(F.data == "my_tickets")
async def on_my_tickets(callback: CallbackQuery):
    await show_my_tickets(callback.message, user_id=callback.from_user.id, edit=True)
    await callback.answer()


async def show_my_tickets(message: Message, user_id: int | None = None, edit: bool = False):
    uid = user_id or (message.from_user.id if message.from_user else None)
    if not uid:
        return
    try:
        from database.connection import async_session_factory
        from sqlalchemy import text as sql_text
        tickets = []
        if async_session_factory:
            async with async_session_factory() as session:
                async with session.begin():
                    result = await session.execute(
                        sql_text(
                            "SELECT id, original_text, status, created_at "
                            "FROM support_tickets WHERE user_id = :uid "
                            "ORDER BY created_at DESC LIMIT 10"
                        ),
                        {"uid": uid},
                    )
                    tickets = result.mappings().all()
    except Exception as e:
        logger.error(f"show_my_tickets error: {e}")
        tickets = []

    if not tickets:
        text = (
            "📋 <b>Мои обращения</b>\n\n"
            "У тебя пока нет обращений.\n"
            "Нажми <b>Создать обращение</b> чтобы написать нам."
        )
    else:
        lines = ["📋 <b>Мои обращения</b>\n"]
        for t in tickets:
            tid      = str(t["id"])[:8].upper()
            status   = STATUS_LABELS.get(t["status"], t["status"])
            created  = t["created_at"]
            date_str = created.strftime("%d.%m.%Y %H:%M") if hasattr(created, "strftime") else str(created)[:16]
            raw      = t["original_text"] or ""
            preview  = raw.split("«")[-1].split("»")[0][:60] if "«" in raw else raw[:60]
            lines.append(
                f"• <code>#{tid}</code> — {status}\n"
                f"  📅 {date_str}\n"
                f"  💬 {preview}..."
            )
        text = "\n\n".join(lines)

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️  Создать обращение", callback_data="new_ticket")],
        [InlineKeyboardButton(text="← Главное меню",        callback_data="back_to_menu")],
    ])
    if edit:
        try:
            await message.edit_text(text, parse_mode="HTML", reply_markup=kb)
        except Exception:
            await message.answer(text, parse_mode="HTML", reply_markup=kb)
    else:
        await message.answer(text, parse_mode="HTML", reply_markup=kb)
