"""SOULDAWN Support Bot — AI Assistant integration with live operator fallback."""
from __future__ import annotations
import asyncio
import logging
from aiogram import Router, F, Bot
from aiogram.types import Message
from openai import AsyncOpenAI

from config import OPENAI_API_KEY, OPENAI_BASE_URL, SUPPORT_CHAT_IDS

router = Router()
logger = logging.getLogger("SOULDAWN.support")

# Инициализируем клиента OpenAI/OpenRouter
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

SYSTEM_PROMPT = """Ты — ИИ-ассистент поддержки бренда уличной одежды SOULDAWN.
Помогай клиентам отвечать на вопросы о заказах, качестве вещей, доставке.
Отвечай вежливо, лаконично и стильно.
⚠️ ВАЖНО: Если пользователь просит позвать человека, требует оператора, хочет оформить возврат или ты не знаешь ответ — напиши строго одну фразу: '[OPERATOR]' и абсолютно ничего больше."""

@router.message(F.text)
async def handle_support_message(message: Message, bot: Bot):
    if not OPENAI_API_KEY:
        await forward_to_operators(message, bot)
        return

    try:
        response = await openai_client.chat.completions.create(
            model="meta-llama/llama-3-8b-instruct:free",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message.text}
            ],
            timeout=15.0
        )
        ai_answer = response.choices.message.content.strip()

        if "[OPERATOR]" in ai_answer:
            await message.answer("🔄 Перенаправляю ваш запрос живому оператору. Пожалуйста, ожидайте...")
            await forward_to_operators(message, bot)
        else:
            await message.answer(ai_answer)

    except Exception as e:
        logger.error(f"AI Support error: {e}")
        await message.answer("🔄 Связываю вас с оператором службы поддержки...")
        await forward_to_operators(message, bot)

async def forward_to_operators(message: Message, bot: Bot):
    if not SUPPORT_CHAT_IDS:
        return
    text = (
        f"❓ <b>Новое обращение в саппорт-бот!</b>\n\n"
        f"Пользователь: @{message.from_user.username or '—'}\n"
        f"Telegram ID: <code>{message.from_user.id}</code>\n\n"
        f"Текст обращения:\n<i>{message.text}</i>"
    )
    for op_id in SUPPORT_CHAT_IDS:
        try:
            await bot.send_message(chat_id=op_id, text=text, parse_mode="HTML")
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Failed to notify operator {op_id}: {e}")
