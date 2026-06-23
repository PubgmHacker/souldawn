"""
SOULDAWN — Логгер событий в Telegram.

Отправляет форматированные уведомления админам через main-бот.
Используется в handlers/ и из support_bot.py.

Фикс: переиспользуем существующий экземпляр Bot вместо создания нового на каждый вызов.

Env: BOT_TOKEN, ADMIN_IDS
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger("SOULDAWN.logger")

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()]

# Глобальный экземпляр Bot — создаётся один раз и переиспользуется
_logger_bot = None


def _get_logger_bot():
    """Возвращает глобальный Bot для логгера. Создаёт при первом вызове."""
    global _logger_bot
    if _logger_bot is None and BOT_TOKEN:
        from aiogram import Bot
        _logger_bot = Bot(token=BOT_TOKEN)
    return _logger_bot


async def _send_to_admins(text: str, bot=None) -> None:
    """Отправляет сообщение всем админам.

    Если передан bot — используем его (main-бот уже запущен).
    Иначе — берём глобальный экземпляр (не создаём новый!).
    """
    if not ADMIN_IDS:
        return

    # Используем переданный bot или глобальный — никогда не создаём новый
    _bot = bot or _get_logger_bot()
    if not _bot:
        logger.warning("bot_logger: no bot instance available, skipping")
        return

    for admin_id in ADMIN_IDS:
        try:
            await _bot.send_message(admin_id, text, parse_mode="HTML")
        except Exception as e:
            logger.warning(f"bot_logger: failed to notify admin {admin_id}: {e}")


async def log_new_user(
    telegram_id: int,
    username: Optional[str],
    name: Optional[str],
    bot=None,
) -> None:
    """Новый пользователь зарегистрировался."""
    uname = f"@{username}" if username else "—"
    text = (
        f"🌅  <b>Новый пользователь</b>\n\n"
        f"👤  {name or '—'} · {uname}\n"
        f"🆔  ID: <code>{telegram_id}</code>"
    )
    await _send_to_admins(text, bot)


async def log_new_order(
    order_id: str,
    total_kopecks: int,
    items_summary: str,
    username: Optional[str],
    telegram_id: Optional[int],
    bot=None,
) -> None:
    """Новый заказ создан."""
    uname = f"@{username}" if username else "—"
    total_rub = total_kopecks / 100
    text = (
        f"📦  <b>Новый заказ</b>\n\n"
        f"🆔  #{order_id[:8]}\n"
        f"💰  {total_rub:,.0f} ₽\n"
        f"👤  {uname} (ID: {telegram_id or '—'})\n\n"
        f"📝  {items_summary[:300]}"
    )
    await _send_to_admins(text, bot)


async def log_payment_confirmed(
    order_id: str,
    total_kopecks: int,
    username: Optional[str],
    telegram_id: Optional[int],
    bot=None,
) -> None:
    """Оплата подтверждена."""
    uname = f"@{username}" if username else "—"
    total_rub = total_kopecks / 100
    text = (
        f"💳  <b>Оплата подтверждена</b>\n\n"
        f"🆔  #{order_id[:8]}\n"
        f"💰  {total_rub:,.0f} ₽\n"
        f"👤  {uname} (ID: {telegram_id or '—'})"
    )
    await _send_to_admins(text, bot)


async def log_support_ticket(
    ticket_id: str,
    telegram_id: int,
    username: Optional[str],
    name: Optional[str],
    text_preview: str,
    bot=None,
) -> None:
    """Новое обращение в поддержку."""
    uname = f"@{username}" if username else "—"
    text = (
        f"💬  <b>Обращение в поддержку</b>\n\n"
        f"👤  {name or '—'} · {uname}\n"
        f"🆔  ID: <code>{telegram_id}</code>\n"
        f"🎫  Тикет: <code>{ticket_id[:8]}</code>\n\n"
        f"📝  «{text_preview[:400]}»"
    )
    await _send_to_admins(text, bot)


async def log_order_status_changed(
    order_id: str,
    old_status: str,
    new_status: str,
    bot=None,
) -> None:
    """Статус заказа изменился."""
    labels = {
        "pending":   "Ожидает",
        "paid":      "Оплачен ✅",
        "shipped":   "Отправлен 🚚",
        "delivered": "Доставлен 🌅",
        "cancelled": "Отменён ❌",
    }
    text = (
        f"📦  <b>Статус заказа изменился</b>\n\n"
        f"🆔  #{order_id[:8]}\n"
        f"🔄  {labels.get(old_status, old_status)} → {labels.get(new_status, new_status)}"
    )
    await _send_to_admins(text, bot)
