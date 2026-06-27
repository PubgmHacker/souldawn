"""SOULDAWN — Минимальный health-сервер для Railway.

Весь REST-backend (auth / user / cart / orders / admin / tickets / payment)
переехал в Next.js (web/) на Prisma. Бот больше НЕ держит дублирующий API.
Webhook YooKassa обрабатывает Next.js (/api/webhook/yookassa), пишет статус в БД;
бот подхватывает оплаченные заказы через poll_paid_orders (handlers/payments.py).
"""
from __future__ import annotations

import logging

from aiohttp import web

import database.connection as _db_conn
from config import YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY

logger = logging.getLogger("SOULDAWN")


async def health_check(request: web.Request) -> web.Response:
    return web.json_response({
        "status": "ok",
        "service": "souldawn-bot",
        "yookassa_configured": bool(YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY),
        "db_connected": _db_conn.async_session_factory is not None,
    })


def create_web_app(bot) -> web.Application:
    """Минимальное aiohttp-приложение: только healthcheck."""
    app = web.Application()
    app["bot"] = bot
    app.router.add_get("/health", health_check)
    app.router.add_get("/", health_check)
    return app
