"""SOULDAWN — YooKassa payment service."""
from __future__ import annotations

import base64
import logging
import time

from aiohttp import ClientSession, ClientTimeout

from config import YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_RETURN_URL

logger = logging.getLogger("SOULDAWN")


async def create_yookassa_payment(amount_kopecks: int, description: str, metadata: dict) -> dict | None:
    """Create a YooKassa payment. Returns {id, confirmation_url, status} or None."""
    if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
        logger.warning("YooKassa: YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY not set")
        return None

    auth = base64.b64encode(f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}".encode()).decode()

    payload = {
        "amount": {
            "value": f"{amount_kopecks / 100:.2f}",
            "currency": "RUB",
        },
        "confirmation": {
            "type": "redirect",
            "return_url": YOOKASSA_RETURN_URL,
        },
        "capture": True,
        "description": description,
        "metadata": metadata,
    }

    try:
        async with ClientSession() as s:
            async with s.post(
                "https://api.yookassa.ru/v3/payments",
                headers={
                    "Authorization": f"Basic {auth}",
                    "Content-Type": "application/json",
                    "Idempotence-Key": f"order-{int(time.time())}-{metadata.get('user_id', 0)}",
                },
                json=payload,
                timeout=ClientTimeout(total=15),
            ) as r:
                body = await r.json()
                if r.status not in (200, 201):
                    logger.error(f"YooKassa create payment: HTTP {r.status}: {body}")
                    return None
                return {
                    "id": body["id"],
                    "confirmation_url": body["confirmation"]["confirmation_url"],
                    "status": body.get("status", "pending"),
                }
    except Exception as e:
        logger.error(f"YooKassa exception: {type(e).__name__}: {e}")
        return None


async def check_yookassa_payment(payment_id: str) -> dict | None:
    """Check payment status via YooKassa API (polling fallback)."""
    if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
        return None

    auth = base64.b64encode(f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}".encode()).decode()

    try:
        async with ClientSession() as s:
            async with s.get(
                f"https://api.yookassa.ru/v3/payments/{payment_id}",
                headers={"Authorization": f"Basic {auth}"},
                timeout=ClientTimeout(total=10),
            ) as r:
                if r.status != 200:
                    return None
                return await r.json()
    except Exception as e:
        logger.error(f"YooKassa check: {type(e).__name__}: {e}")
        return None
