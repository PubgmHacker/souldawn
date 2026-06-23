"""SOULDAWN Bot — Entry point: Bot, Dispatcher, middleware, routers, aiohttp web server."""
from __future__ import annotations

import asyncio
import logging
import sys
import time

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    BotCommand,
    BotCommandScopeDefault,
    BotCommandScopeChat,
)
from aiohttp import web

from config import BOT_TOKEN, WEBHOOK_PORT, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, YOOKASSA_SHOP_ID, ADMIN_IDS
from database import init_db, set_bot, dispose_db
from handlers import all_routers
from handlers.api_web import create_web_app
from handlers.payments import poll_paid_orders
from middlewares.registration import RegistrationMiddleware
from middlewares.subscription import SubscriptionMiddleware

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("SOULDAWN")


async def cleanup_pending_orders():
    """Remove pending orders older than 30 minutes."""
    while True:
        await asyncio.sleep(300)
        now = time.time()
        from handlers.payments import pending_orders
        expired = [pid for pid, o in pending_orders.items()
                   if o["status"] == "pending" and now - o["created_at"] > 1800]
        for pid in expired:
            del pending_orders[pid]
            logger.info(f"Cleaned up expired order: {pid}")


async def main():
    bot = Bot(token=BOT_TOKEN)
    set_bot(bot)

    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    # Register middleware (порядок важен: сначала регистрация юзера,
    # затем gate по подписке на основной канал).
    dp.update.outer_middleware(RegistrationMiddleware())
    dp.update.outer_middleware(SubscriptionMiddleware())

    # Include all routers
    dp.include_routers(*all_routers)

    # Init database
    await init_db()
    from database.connection import async_session_factory
    logger.info(f"DB status: {'connected' if async_session_factory else 'DISABLED'}")

    # Set bot commands.
    # Публичные команды видят все пользователи. /admin, /broadcast, /notify
    # НЕ входят сюда — они выдаются только админам через per-chat scope ниже,
    # поэтому обычным юзерам служебные слеши не показываются.
    public_commands = [
        BotCommand(command="start", description="\U0001F3E0 Меню"),
        BotCommand(command="catalog", description="\U0001F6CD Каталог"),
        BotCommand(command="order", description="\U0001F4E6 Мой заказ"),
        BotCommand(command="help", description="\u2139\uFE0F Помощь"),
    ]
    await bot.set_my_commands(public_commands, scope=BotCommandScopeDefault())

    # Админам — публичные + админские команды (видны только им).
    admin_commands = public_commands + [
        BotCommand(command="admin", description="\U0001F5A5 Админ-панель"),
        BotCommand(command="broadcast", description="\U0001F4E3 Рассылка"),
        BotCommand(command="notify", description="\U0001F525 Уведомление"),
    ]
    for _admin_id in ADMIN_IDS:
        try:
            await bot.set_my_commands(
                admin_commands, scope=BotCommandScopeChat(chat_id=_admin_id)
            )
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to set admin commands for {_admin_id}: {e}")

    logger.info("SOULDAWN Bot started!")
    if OPENAI_API_KEY:
        logger.info(f"AI: {OPENAI_MODEL} via {OPENAI_BASE_URL.split('/')[2]}")
    else:
        pass
    if YOOKASSA_SHOP_ID:
        logger.info(f"YooKassa: shop_id={YOOKASSA_SHOP_ID[:6]}...")
    else:
        logger.warning("YooKassa not configured")

    # Start minimal health server (Railway healthcheck only)
    app = create_web_app(bot)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", WEBHOOK_PORT)
    await site.start()
    logger.info(f"Health server: port {WEBHOOK_PORT}")

    # Start background tasks
    asyncio.create_task(cleanup_pending_orders())
    # Подтверждение оплаченных заказов из БД (Next.js webhook ставит 'paid').
    asyncio.create_task(poll_paid_orders(bot))

    # Start polling
    await dp.start_polling(bot)


if __name__ == "__main__":
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not set. Export BOT_TOKEN env variable and restart.")
        sys.exit(1)
    asyncio.run(main())
