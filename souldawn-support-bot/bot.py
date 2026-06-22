"""SOULDAWN Support Bot — Entry point."""
from __future__ import annotations

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeDefault
from aiohttp import web

from config import BOT_TOKEN, WEBHOOK_PORT
from database import init_db, set_bot
from handlers import all_routers

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("SOULDAWN.support")


async def main():
    bot = Bot(token=BOT_TOKEN)
    set_bot(bot)

    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)
    dp.include_routers(*all_routers)

    await init_db()

    await bot.set_my_commands([
        BotCommand(command="start",   description="Главное меню"),
        BotCommand(command="tickets", description="Мои обращения"),
        BotCommand(command="new",     description="Новое обращение"),
    ], scope=BotCommandScopeDefault())

    logger.info("SOULDAWN Support Bot started!")

    async def health(request):
        return web.Response(text="ok")

    app = web.Application()
    app.router.add_get("/health", health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", WEBHOOK_PORT)
    await site.start()
    logger.info(f"Health server: port {WEBHOOK_PORT}")

    await dp.start_polling(bot)


if __name__ == "__main__":
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not set.")
        sys.exit(1)
    asyncio.run(main())
