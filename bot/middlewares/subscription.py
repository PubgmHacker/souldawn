"""SOULDAWN — Ненавязчивое напоминание о канале бренда.

Доступ к боту НИКОГДА не блокируется. Миддлваре лишь периодически
напоминает, что у бренда есть Telegram-канал с новостями и дропами:
  - каждые CHANNEL_REMIND_EVERY ответов бота,
  - только тем, кто ещё не подписан (подписчиков не беспокоим).

Статус подписки кэшируется на TTL секунд, чтобы не дёргать Telegram API.
Если CHANNEL_ID не задан — напоминания отключены.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware, Bot
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    TelegramObject,
)

from config import (
    ADMIN_IDS,
    CHANNEL_ID,
    CHANNEL_REMIND_EVERY,
    CHANNEL_URL,
)

logger = logging.getLogger("SOULDAWN")

# Статусы, означающие активное членство в канале.
_MEMBER_STATUSES = {"creator", "administrator", "member", "restricted"}
# TTL кэша статуса подписки (секунды).
_CACHE_TTL = 300


def _reminder_text() -> str:
    return (
        "\U0001F4E2  Кстати, у SOULDAWN есть Telegram-канал.\n\n"
        "Новые дропы, закрытые предложения, протоколы и новости бренда — "
        "подпишись, чтобы следить за новостями первым."
    )


def _reminder_kb() -> InlineKeyboardMarkup | None:
    if CHANNEL_URL:
        return InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="\U0001F4E2  Подписаться на канал", url=CHANNEL_URL)]
            ]
        )
    return None


class SubscriptionMiddleware(BaseMiddleware):
    """Ненавязчивое напоминание о канале бренда. Доступ не блокирует."""

    def __init__(self) -> None:
        super().__init__()
        # user_id -> (is_member, checked_at)
        self._cache: Dict[int, tuple[bool, float]] = {}
        # user_id -> счётчик ответов бота (для напоминания)
        self._msg_count: Dict[int, int] = {}

    async def _is_member(self, bot: Bot, user_id: int) -> bool:
        # Админы считаются подписанными (не напоминаем).
        if user_id in ADMIN_IDS:
            return True

        cached = self._cache.get(user_id)
        now = time.time()
        if cached and now - cached[1] < _CACHE_TTL:
            return cached[0]

        try:
            member = await bot.get_chat_member(CHANNEL_ID, user_id)
            is_member = member.status in _MEMBER_STATUSES
        except Exception as e:
            # Не смогли проверить (бот не админ канала / канал недоступен) —
            # считаем подписанным, чтобы не спамить напоминаниями из-за мисконфига.
            logger.warning(f"Subscription check failed for {user_id}: {e}")
            is_member = True

        self._cache[user_id] = (is_member, now)
        return is_member

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # СНАЧАЛА всегда обрабатываем апдейт — доступ не блокируется никогда.
        result = await handler(event, data)

        # Напоминание отключено, если канал не сконфигурирован.
        if not CHANNEL_ID:
            return result

        bot: Bot | None = data.get("bot")
        user = getattr(event, "from_user", None)
        if not bot or not user or not user.id or user.is_bot:
            return result

        # Напоминаем только на сообщения (не на каждый коллбэк).
        if not isinstance(event, Message):
            return result

        count = self._msg_count.get(user.id, 0) + 1
        self._msg_count[user.id] = count
        if count % CHANNEL_REMIND_EVERY != 0:
            return result

        # Подписчиков не беспокоим.
        if await self._is_member(bot, user.id):
            return result

        try:
            await bot.send_message(user.id, _reminder_text(), reply_markup=_reminder_kb())
        except Exception:
            pass

        return result
