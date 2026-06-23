"""SOULDAWN Support Bot — High Availability AI Assistant."""
from __future__ import annotations
import asyncio
import logging
from aiogram import Router, F, Bot
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import CommandStart
from openai import AsyncOpenAI

from config import OPENAI_API_KEY, SUPPORT_CHAT_IDS, SUPPORT_MINIAPP_URL

router = Router()
logger = logging.getLogger("SOULDAWN.support")

# Жестко страхуем URL OpenRouter, чтобы исключить ошибки переменных окружения
base_url = "https://openrouter.ai"
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=base_url)

SYSTEM_PROMPT = """Ты — ИИ-ассистент поддержки бренда уличной одежды SOULDAWN.
Помогай клиентам отвечать на вопросы о заказах, качестве вещей, доставке.
Отвечай вежливо, лаконично и стильно.
⚠️ ВАЖНО: Если пользователь просит позвать человека, требует оператора, хочет оформить возврат или ты не знаешь ответ — напиши строго одну фразу: '[OPERATOR]' и абсолютно ничего больше."""

# Топ самых стабильных БЕСПЛАТНЫХ моделей на OpenRouter (Gemini Flash на первом месте)
MODELS_TO_TRY = [
    "google/gemini-2.5-flash:free",
    "meta-llama/llama-3-8b-instruct:free",
    "qwen/qwen-2-7b-instruct:free"
]

@router.message(CommandStart())
async def cmd_start_support(message: Message):
    welcome_text = (
        "👋 <b>Добро пожаловать в службу поддержки SOULDAWN!</b>\n\n"
        "Напишите ваш вопрос прямо сюда, и наш ИИ-помощник моментально ответит вам.\n\n"
        "Если ваш вопрос сложный или вы хотите пообщаться с человеком, просто откройте окно поддержки ниже или напишите свой вопрос в чат."
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Открыть окно поддержки", web_app=WebAppInfo(url=SUPPORT_MINIAPP_URL))],
        [InlineKeyboardButton(text="💬 Позвать оператора в чат", callback_data="ticket:call_operator")]
    ])
    
    await message.answer(welcome_text, parse_mode="HTML", reply_markup=kb)

@router.callback_query(F.data == "ticket:call_operator")
async def call_operator_callback(callback, bot: Bot):
    await callback.message.answer("🔄 Вызываю живого оператора. Пожалуйста, опишите вашу проблему, мы уже бежим на помощь!")
    
    fake_message = callback.message
    fake_message.from_user = callback.from_user
    fake_message.text = "[Пользователь нажал кнопку вызова оператора]"
    
    await forward_to_operators(fake_message, bot, ai_answer="Пользователь сразу запросил человека через кнопку.")
    await callback.answer()

@router.message(F.text & ~F.text.startswith("/"))
async def handle_support_message(message: Message, bot: Bot):
    if not OPENAI_API_KEY:
        await forward_to_operators(message, bot)
        return

    ai_answer = None
    
    for model_name in MODELS_TO_TRY:
        try:
            response = await openai_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": message.text}
                ],
                timeout=8.0
            )
            ai_answer = response.choices.message.content.strip()
            if ai_answer:
                break
        except Exception as e:
            logger.warning(f"Model {model_name} connection error: {e}")
            continue

    if not ai_answer:
        await message.answer("🔄 Связываю вас с оператором службы поддержки...")
        await forward_to_operators(message, bot, ai_answer=None)
        return

    if "[OPERATOR]" in ai_answer:
        await message.answer("🔄 Перенаправляю ваш запрос живому оператору. Пожалуйста, ожидайте...")
        await forward_to_operators(message, bot, ai_answer=ai_answer)
    else:
        await message.answer(ai_answer)

async def forward_to_operators(message: Message, bot: Bot, ai_answer: str | None = None):
    if not SUPPORT_CHAT_IDS:
        return
        
    ai_status = f"\n\n🤖 <b>Ответ ИИ пользователю:</b>\n<i>{ai_answer}</i>" if ai_answer else "\n\n🤖 <b>Ответ ИИ:</b> Не успел ответить / ошибка"
    
    text = (
        f"❓ <b>Новое обращение в саппорт-бот!</b>\n\n"
        f"Пользователь: @{message.from_user.username or '—'}\n"
        f"Telegram ID: <code>{message.from_user.id}</code>\n\n"
        f"Текст обращения:\n<i>{message.text}</i>"
        f"{ai_status}"
    )
    
    # Создаем клавиатуру с кнопкой ответа для операторов (привязываем к ID сообщения юзера)
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Ответить пользователю", callback_data=f"ticket:msg_reply:{message.from_user.id}:{message.message_id}")]
    ])
    
    for op_id in SUPPORT_CHAT_IDS:
        try:
            await bot.send_message(chat_id=op_id, text=text, parse_mode="HTML", reply_markup=kb)
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Failed to notify operator {op_id}: {e}")
