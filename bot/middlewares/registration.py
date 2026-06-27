"""SOULDAWN — Auto-registration + click-logging middleware."""
from __future__ import annotations

from typing import Any, Callable, Dict, Awaitable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from database import get_or_create_user, log_action


class RegistrationMiddleware(BaseMiddleware):
    """Auto-registers users in DB on every update and logs callback clicks."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Extract user from message or callback
        user = getattr(event, "from_user", None)
        if user and user.id and not user.is_bot:
            # Register / update user
            db_user = await get_or_create_user(
                user.id,
                user.username or "",
                user.first_name or "",
            )
            data["db_user"] = db_user

            # Log callback clicks
            if hasattr(event, "data") and hasattr(event, "message"):
                callback_data = getattr(event, "data", "")
                if callback_data:
                    await log_action(user.id, "click", callback_data)

        return await handler(event, data)
