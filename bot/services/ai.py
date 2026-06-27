"""SOULDAWN — AI assistant service."""
from __future__ import annotations

import logging

from aiohttp import ClientSession, ClientTimeout

from config import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL

logger = logging.getLogger("SOULDAWN")

SOULDAWN_KB = """Ты — AI-ассистент бренда SOULDAWN, streetwear-бренд одежды.

Данные:
- Название: SOULDAWN · Девиз: БОРЬБА · АУТЕНТИЧНОСТЬ · РАССВЕТ
- Товары: Hoodies (7 990-10 490₽), T-Shirts (3 990-5 490₽), Pants (9 490-11 990₽), Accessories (2 990-6 490₽)
- Размеры: S/M/L/XL, оверсайз
- Доставка: СДЭК 350₽, Почта 250₽, Яндекс 300₽. Бесплатно от 5 000₽
- Возврат: 14 дней, с бирками
- Оплата: Visa/MC/МИР, СБП, YooKassa
- Качество: 100% хлопок, YKK фурнитура

Правила:
- Отвечай КОРОТКО (до 500 символов)
- Всегда отвечай на русском языке
- Если вопрос связан с брендом, товарами, доставкой — ОТВЕЧАЙ, не отправляй оператору
- HANDOFF только для жалоб, споров, возвратов, личных данных"""


async def ask_ai(text: str) -> str:
    if not OPENAI_API_KEY:
        logger.warning("AI: OPENAI_API_KEY not set")
        return "HANDOFF"
    try:
        async with ClientSession() as s:
            async with s.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": SOULDAWN_KB},
                        {"role": "user", "content": text},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                },
                timeout=ClientTimeout(total=30),
            ) as r:
                body = await r.json()
                if r.status != 200:
                    logger.error(f"AI HTTP {r.status}: {body}")
                    return f"AI temporarily unavailable (error {r.status}). Try later or contact operator."
                content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not content:
                    logger.error(f"AI empty response: {body}")
                    return "AI could not process the question. Contact operator."
                return content.strip()
    except Exception as e:
        logger.error(f"AI exception: {type(e).__name__}: {e}")
        return "AI connection error. Try later."
