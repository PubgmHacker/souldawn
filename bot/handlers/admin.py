"""SOULDAWN — Admin handlers: /admin (WebApp), broadcast FSM, ticket system."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from aiogram import Router, F, Bot
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, WebAppInfo,
)
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramRetryAfter, TelegramForbiddenError

from config import ADMIN_IDS, MINIAPP_URL
from database import (
    get_all_users, get_ticket, get_ticket_by_message_id, get_ticket_by_accepted_admin,
    take_ticket as db_take_ticket,
    close_ticket, update_ticket_status, deactivate_user,
    get_full_stats, get_online_users, get_recent_orders, get_open_tickets, get_expenses,
)
import database.connection as _db_conn
from keyboards import admin_panel_kb, admin_back_kb
from states.support_states import BroadcastStates

router = Router()
logger = logging.getLogger("SOULDAWN")


# ======================== /admin ========================
ADMIN_PANEL_TITLE = (
    "\U0001F5A5  <b>SOULDAWN · Админ-панель</b>\n\n"
    "Выбери раздел ниже."
)


def _is_admin(uid: int) -> bool:
    return uid in ADMIN_IDS


@router.message(Command("admin"))
async def cmd_admin(message: Message):
    if not _is_admin(message.from_user.id):
        return  # тихо игнорируем — команда вообще не показывается обычным юзерам
    await message.answer(ADMIN_PANEL_TITLE, parse_mode="HTML", reply_markup=admin_panel_kb())


@router.callback_query(F.data == "admin:home")
async def on_admin_home(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        await callback.message.edit_text(
            ADMIN_PANEL_TITLE, parse_mode="HTML", reply_markup=admin_panel_kb()
        )
    except Exception:
        await callback.message.answer(
            ADMIN_PANEL_TITLE, parse_mode="HTML", reply_markup=admin_panel_kb()
        )
    await callback.answer()


async def _show_section(callback: CallbackQuery, text: str) -> None:
    try:
        await callback.message.edit_text(text, parse_mode="HTML", reply_markup=admin_back_kb())
    except Exception:
        await callback.message.answer(text, parse_mode="HTML", reply_markup=admin_back_kb())
    await callback.answer()


def _fmt_rub(kopecks: int) -> str:
    return f"{(kopecks or 0) / 100:,.0f} \u20bd".replace(",", " ")


@router.callback_query(F.data == "admin:stats")
async def on_admin_stats(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        s = await get_full_stats() or {}
    except Exception as e:  # noqa: BLE001
        logger.error(f"admin stats error: {e}")
        s = {}
    text = (
        "\U0001F4CA  <b>Статистика</b>\n\n"
        f"\U0001F465  Пользователи: <b>{s.get('total_users', 0)}</b>\n"
        f"\U0001F7E2  Активные: <b>{s.get('active_users', 0)}</b>\n"
        f"\U0001F4E6  Заказы: <b>{s.get('total_orders', 0)}</b>\n"
        f"\U0001F4B0  Выручка: <b>{_fmt_rub(s.get('total_revenue', 0))}</b>"
    )
    await _show_section(callback, text)


@router.callback_query(F.data == "admin:online")
async def on_admin_online(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        online = await get_online_users() or []
    except Exception as e:  # noqa: BLE001
        logger.error(f"admin online error: {e}")
        online = []
    text = (
        "\U0001F7E2  <b>Онлайн сейчас</b>\n\n"
        f"Активных за последние минуты: <b>{len(online)}</b>"
    )
    await _show_section(callback, text)


@router.callback_query(F.data == "admin:orders")
async def on_admin_orders(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        orders = await get_recent_orders() or []
    except Exception as e:  # noqa: BLE001
        logger.error(f"admin orders error: {e}")
        orders = []
    lines = ["\U0001F4E6  <b>Последние заказы</b>\n"]
    if not orders:
        lines.append("Пока нет заказов.")
    for o in orders[:10]:
        oid = str(o.get("id", ""))[:8]
        total = _fmt_rub(o.get("total", 0))
        status = o.get("status", "-")
        lines.append(f"• #{oid} — {total} · {status}")
    await _show_section(callback, "\n".join(lines))


@router.callback_query(F.data == "admin:tickets")
async def on_admin_tickets(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        tickets = await get_open_tickets() or []
    except Exception as e:  # noqa: BLE001
        logger.error(f"admin tickets error: {e}")
        tickets = []
    lines = ["\U0001F3AB  <b>Открытые тикеты</b>\n"]
    if not tickets:
        lines.append("Нет открытых тикетов. \u2705")
    for t in tickets[:10]:
        tid = str(t.get("id", ""))[:8]
        preview = (t.get("original_text", "") or "").replace("\n", " ")[:40]
        lines.append(f"• #{tid} — {preview}")
    await _show_section(callback, "\n".join(lines))


@router.callback_query(F.data == "admin:expenses")
async def on_admin_expenses(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    try:
        expenses = await get_expenses() or []
    except Exception as e:  # noqa: BLE001
        logger.error(f"admin expenses error: {e}")
        expenses = []
    total = sum((e.get("amount", 0) or 0) for e in expenses)
    lines = [
        "\U0001F4B0  <b>Расходы</b>\n",
        f"Итого: <b>{_fmt_rub(total)}</b>\n",
    ]
    for e in expenses[:10]:
        cat = e.get("category", "other")
        amt = _fmt_rub(e.get("amount", 0))
        desc = (e.get("description", "") or "")[:30]
        lines.append(f"• {cat}: {amt} {('— ' + desc) if desc else ''}")
    await _show_section(callback, "\n".join(lines))


@router.callback_query(F.data == "admin:broadcast")
async def on_admin_broadcast(callback: CallbackQuery, state: FSMContext):
    if not _is_admin(callback.from_user.id):
        await callback.answer("No access", show_alert=True)
        return
    await state.set_state(BroadcastStates.waiting_for_content)
    text = (
        "\U0001F4E3  <b>Рассылка</b>\n\n"
        "Пришли текст, картинку или видео — бот разошлёт всем активным.\n\n"
        "Для отмены — /cancel"
    )
    try:
        await callback.message.edit_text(text, parse_mode="HTML", reply_markup=admin_back_kb())
    except Exception:
        await callback.message.answer(text, parse_mode="HTML", reply_markup=admin_back_kb())
    await callback.answer()


# ======================== /notify ========================
@router.message(Command("notify"))
async def cmd_notify(message: Message, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        return
    text = message.text.replace("/notify", "", 1).strip()
    if not text:
        await message.answer("Usage: /notify Text")
        return
    user_ids = await get_all_users("drops")
    sent = 0
    for uid in user_ids:
        try:
            await bot.send_message(uid, f"🔥 {text}")
            sent += 1
            await asyncio.sleep(0.3)
        except TelegramRetryAfter as e:
            await asyncio.sleep(e.retry_after)
            try:
                await bot.send_message(uid, f"🔥 {text}")
                sent += 1
            except Exception:
                pass
        except TelegramForbiddenError:
            await deactivate_user(uid)
        except Exception:
            pass
    await message.answer(f"Notification sent: {sent}/{len(user_ids)}")


# ======================== BROADCAST (FSM — media support) ========================

@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        return
    await state.set_state(BroadcastStates.waiting_for_content)
    await message.answer(
        "📣 Рассылка\n\n"
        "Пришли текст, картинку или видео для рассылки.\n"
        "Бот разошлёт всем активным пользователям.\n\n"
        "Для отмены нажми /cancel"
    )


@router.message(Command("cancel"), BroadcastStates.waiting_for_content)
async def on_broadcast_cancel_cmd(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Рассылка отменена")


# ── Receive content + send to all active users ──
@router.message(BroadcastStates.waiting_for_content)
async def handle_broadcast_content(message: Message, state: FSMContext, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        return

    await state.clear()

    # Get all active users
    user_ids = await get_all_users("all")
    print(f"=== BROADCAST: НАЙДЕНО ПОЛЬЗОВАТЕЛЕЙ ДЛЯ РАССЫЛКИ: {len(user_ids)} ===", flush=True)
    logger.info(f"Broadcast: found {len(user_ids)} active users")
    if not user_ids:
        await message.answer("Нет активных пользователей для рассылки.")
        return

    total = len(user_ids)
    await message.answer(f"📣 Начинаю рассылку для {total} пользователей...")

    sent_ok = 0
    sent_fail = 0
    deactivated = 0

    for i, uid in enumerate(user_ids):
        try:
            await message.copy_to(chat_id=uid)
            sent_ok += 1
        except TelegramRetryAfter as e:
            logger.warning(f"Broadcast flood: sleeping {e.retry_after}s")
            await asyncio.sleep(e.retry_after)
            try:
                await message.copy_to(chat_id=uid)
                sent_ok += 1
            except Exception:
                sent_fail += 1
        except TelegramForbiddenError:
            await deactivate_user(uid)
            deactivated += 1
            logger.info(f"Broadcast: user {uid} blocked bot, deactivated")
        except Exception as e:
            sent_fail += 1
            logger.error(f"Broadcast error for {uid}: {e}")

        if (i + 1) % 30 == 0:
            await asyncio.sleep(1.0)
        else:
            await asyncio.sleep(0.3)

    # Save broadcast record
    if _db_conn.async_session_factory:
        async with _db_conn.async_session_factory() as session:
            bc = _db_conn.Broadcast(text=message.text or "[media]", target="all", sent_count=sent_ok)
            session.add(bc)
            await session.commit()

    report = (
        f"📣 Рассылка завершена\n\n"
        f"Всего: {total}\n"
        f"✅ Доставлено: {sent_ok}\n"
        f"❌ Ошибки: {sent_fail}\n"
        f"🚫 Заблокировали бота: {deactivated}"
    )
    await message.answer(report)
    logger.info(f"Broadcast done: {sent_ok}/{total} ok, {sent_fail} fail, {deactivated} deactivated")


# ======================== TAKE TICKET ========================
@router.callback_query(F.data.startswith("take_ticket:"))
async def on_take_ticket(callback: CallbackQuery, bot: Bot):
    admin_id = callback.from_user.id
    if admin_id not in ADMIN_IDS:
        await callback.answer("No access", show_alert=True)
        return

    ticket_id = callback.data.split(":", 1)[1]
    if not ticket_id:
        await callback.answer("❌ Некорректный ID тикета", show_alert=True)
        return

    ticket = await get_ticket(ticket_id)

    if not ticket:
        await callback.answer("❌ Тикет не найден", show_alert=True)
        return

    if ticket["status"] not in ("open",):
        await callback.answer("⚠️ Этот тикет уже обработан", show_alert=True)
        return

    admin_name = callback.from_user.first_name or callback.from_user.username or str(admin_id)
    success = await db_take_ticket(ticket_id, admin_id, admin_name)

    if not success:
        await callback.answer("❌ Этот вопрос уже взял другой оператор!", show_alert=True)
        return

    now_str = datetime.now().strftime("%d.%m %H:%M")

    # Edit all admin messages
    admin_messages = ticket.get("admin_messages", [])
    for entry in admin_messages:
        try:
            eid = entry.get("admin_id", 0)
            emid = entry.get("message_id", 0)
            if not emid:
                continue

            if eid == admin_id:
                await bot.edit_message_text(
                    chat_id=admin_id,
                    message_id=emid,
                    text=f"{ticket.get('original_text', '')}\n\n🟢 Вы взяли это обращение ({now_str})",
                    reply_markup=None,
                )
            else:
                await bot.edit_message_text(
                    chat_id=eid,
                    message_id=emid,
                    text=f"{ticket.get('original_text', '')}\n\n❌ Уже взял: {admin_name}",
                    reply_markup=None,
                )
        except Exception as e:
            logger.error(f"Error editing ticket msg for admin {entry.get('admin_id')}: {e}")

    await callback.answer("🟢 Вы взяли этот вопрос в работу!")

    # Send a notification to the accepting admin
    await bot.send_message(
        admin_id,
        f"🟢 Вы взяли тикет #{ticket_id[:8]} в работу.\n"
        f"Отвечай реплаем на это сообщение, чтобы отправить ответ клиенту."
    )


# ======================== ADMIN REPLY TO TICKET ========================
@router.message(F.reply_to_message)
async def handle_admin_reply(message: Message, bot: Bot):
    """Catch admin replies to tickets → forward to client anonymously."""
    admin_id = message.from_user.id
    if admin_id not in ADMIN_IDS:
        return

    reply_to = message.reply_to_message
    if not reply_to:
        return

    # Find ticket by the admin's message ID in the JSONB array
    ticket = await get_ticket_by_message_id(reply_to.message_id)
    if not ticket:
        # Fallback: if admin replied to the "took ticket" notification
        ticket = await get_ticket_by_accepted_admin(admin_id)
    if not ticket:
        return

    ticket_id = ticket.get("id", "")
    user_id = ticket.get("user_id", 0)

    # Check if this admin accepted the ticket
    accepted_by = ticket.get("accepted_by")
    if accepted_by and accepted_by != admin_id:
        admin_who = ticket.get("admin_name", "другой оператор")
        await message.answer(f"⚠️ Этот тикет уже взял в работу {admin_who}. Ты не можешь отвечать.")
        return

    if ticket.get("status") in ("closed", "answered"):
        await message.answer("⚠️ Этот тикет уже закрыт")
        return

    # Get reply text
    reply_text = message.text or ""
    if not reply_text and message.caption:
        reply_text = message.caption
    if not reply_text:
        return

    # Send anonymous reply to client
    try:
        await bot.send_message(
            user_id,
            f"💬 Ответ от поддержки:\n\n{reply_text}",
        )
        logger.info(f"Admin reply forwarded to user={user_id} from admin={admin_id}")
    except Exception as e:
        logger.error(f"Error forwarding reply to user={user_id}: {e}")
        await message.answer(f"❌ Не удалось отправить: {e}")
        return

    # Mark ticket as answered + close
    admin_name = message.from_user.first_name or "Админ"
    await update_ticket_status(ticket_id, "answered", admin_name)
    await close_ticket(ticket_id)

    # Edit all admin messages to show answered
    admin_messages = ticket.get("admin_messages", [])
    now_str = datetime.now().strftime("%d.%m %H:%M")
    for entry in admin_messages:
        try:
            eid = entry.get("admin_id", 0)
            emid = entry.get("message_id", 0)
            if not emid:
                continue
            await bot.edit_message_text(
                chat_id=eid,
                message_id=emid,
                text=f"{ticket.get('original_text', '')}\n\n✅ Отвечено: @{admin_name} ({now_str})",
                reply_markup=None,
            )
        except Exception as e:
            logger.error(f"Error editing ticket msg for admin {entry.get('admin_id')}: {e}")

    await message.answer("✅ Ответ отправлен клиенту (анонимно)")
