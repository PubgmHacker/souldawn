"""SOULDAWN Support Bot — Admin handlers."""
from __future__ import annotations

import logging
from datetime import datetime

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup

from config import ADMIN_IDS
from database import (
    get_ticket, get_ticket_by_message_id, get_ticket_by_accepted_admin,
    take_ticket as db_take_ticket,
    close_ticket, update_ticket_status,
)

router = Router()
logger = logging.getLogger("SOULDAWN.support.admin")


@router.callback_query(F.data.startswith("take_ticket:"))
async def on_take_ticket(callback: CallbackQuery, bot: Bot):
    admin_id = callback.from_user.id
    if admin_id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    ticket_id = callback.data.split(":", 1)[1]
    ticket    = await get_ticket(ticket_id)

    if not ticket:
        await callback.answer("Тикет не найден", show_alert=True)
        return
    if ticket["status"] not in ("open",):
        await callback.answer("Тикет уже обработан", show_alert=True)
        return

    admin_name = callback.from_user.first_name or callback.from_user.username or str(admin_id)
    if not await db_take_ticket(ticket_id, admin_id, admin_name):
        await callback.answer("Тикет уже взял другой оператор!", show_alert=True)
        return

    now_str = datetime.now().strftime("%d.%m %H:%M")
    for entry in ticket.get("admin_messages", []):
        try:
            eid  = entry.get("admin_id", 0)
            emid = entry.get("message_id", 0)
            if not emid:
                continue
            txt = ticket.get("original_text", "")
            if eid == admin_id:
                await bot.edit_message_text(chat_id=eid, message_id=emid,
                    text=f"{txt}\n\n🟢 Вы взяли это обращение ({now_str})", reply_markup=None)
            else:
                await bot.edit_message_text(chat_id=eid, message_id=emid,
                    text=f"{txt}\n\n❌ Уже взял: {admin_name}", reply_markup=None)
        except Exception as e:
            logger.error(f"Error editing ticket msg: {e}")

    await callback.answer("🟢 Вы взяли обращение в работу!")
    await bot.send_message(
        admin_id,
        f"🟢 Тикет #{ticket_id[:8].upper()} в работе.\n"
        f"Отвечай реплаем на это сообщение — ответ уйдёт клиенту анонимно.",
    )


@router.message(F.reply_to_message)
async def handle_admin_reply(message: Message, bot: Bot):
    admin_id = message.from_user.id
    if admin_id not in ADMIN_IDS:
        return

    reply_to = message.reply_to_message
    if not reply_to:
        return

    ticket = await get_ticket_by_message_id(reply_to.message_id)
    if not ticket:
        ticket = await get_ticket_by_accepted_admin(admin_id)
    if not ticket:
        return

    ticket_id = ticket.get("id", "")
    user_id   = ticket.get("user_id", 0)

    accepted_by = ticket.get("accepted_by")
    if accepted_by and accepted_by != admin_id:
        await message.answer(f"⚠️ Тикет взял {ticket.get('admin_name', 'другой оператор')}. Ты не можешь отвечать.")
        return
    if ticket.get("status") in ("closed", "answered"):
        await message.answer("⚠️ Тикет уже закрыт.")
        return

    reply_text = message.text or message.caption or ""
    if not reply_text:
        return

    try:
        await bot.send_message(
            user_id,
            f"💬 <b>Ответ от поддержки SOULDAWN:</b>\n\n{reply_text}",
            parse_mode="HTML",
        )
    except Exception as e:
        logger.error(f"Error sending reply to user={user_id}: {e}")
        await message.answer(f"❌ Не удалось отправить: {e}")
        return

    admin_name = message.from_user.first_name or "Оператор"
    await update_ticket_status(ticket_id, "answered", admin_name)
    await close_ticket(ticket_id)

    now_str = datetime.now().strftime("%d.%m %H:%M")
    for entry in ticket.get("admin_messages", []):
        try:
            eid  = entry.get("admin_id", 0)
            emid = entry.get("message_id", 0)
            if not emid:
                continue
            await bot.edit_message_text(
                chat_id=eid, message_id=emid,
                text=f"{ticket.get('original_text', '')}\n\n✅ Отвечено: {admin_name} ({now_str})",
                reply_markup=None,
            )
        except Exception as e:
            logger.error(f"Error editing ticket msg: {e}")

    await message.answer("✅ Ответ отправлен клиенту.")
