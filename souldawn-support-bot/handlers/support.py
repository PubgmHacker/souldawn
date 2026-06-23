"""SOULDAWN Support Bot — Custom Role-Based Greetings and Debug Isolation."""
from __future__ import annotations
import asyncio
import logging
import aiohttp
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import CommandStart, Command

from config import OPENAI_API_KEY, SUPPORT_CHAT_IDS, SUPPORT_MINIAPP_URL, ADMIN_IDS

router = Router()
logger = logging.getLogger("SOULDAWN.support")

API_BASE = "https://railway.app"

# ── ХЕНДЛЕР НА /start (РАЗДЕЛЕНИЕ РОЛЕЙ: КЛИЕНТ / ОПЕРАТОР) ──
@router.message(CommandStart())
async def cmd_start_support(message: Message):
    user_id = message.from_user.id
    
    # ПРОВЕРКА: Если зашел оператор/администратор
    if user_id in SUPPORT_CHAT_IDS or user_id in ADMIN_IDS:
        admin_text = (
            "🖥️ <b>Добро пожаловать в Админ-Панель оператора SOULDAWN!</b>\n\n"
            "Вы авторизованы как менеджер службы поддержки. Все обращения клиентов с сайта и из бота будут прилетать вам в этот чат.\n\n"
            "Используйте кнопку ниже, чтобы открыть панель Mini App для управления тикетами в реальном времени."
        )
        
        admin_url = "https://railway.app"
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="⚙️ Открыть Панель Ответов (Mini App)", web_app=WebAppInfo(url=admin_url))],
            [InlineKeyboardButton(text="🛠️ Запустить Дебаг-Меню для тестов", callback_data="admin:debug_menu")]
        ])
        await message.answer(admin_text, parse_mode="HTML", reply_markup=kb)
        return

    # Если зашел обычный клиент
    welcome_text = (
        "👋 <b>Добро пожаловать в службу поддержки SOULDAWN!</b>\n\n"
        "Напишите ваш вопрос прямо сюда, и наша единая синхронная система поддержки моментально свяжет вас с оператором и ИИ.\n\n"
        "Вы также можете отслеживать историю своих обращений через окно поддержки ниже."
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Открыть окно поддержки", web_app=WebAppInfo(url=SUPPORT_MINIAPP_URL))]
    ])
    await message.answer(welcome_text, parse_mode="HTML", reply_markup=kb)


# ── ИЗОЛИРОВАННАЯ КОМАНДА /debug ДЛЯ ТЕСТОВ ОБРАЩЕНИЙ ──
@router.message(Command("debug"))
@router.callback_query(F.data == "admin:debug_menu")
async def cmd_debug_menu(event: Message | CallbackQuery):
    message = event if isinstance(event, Message) else event.message
    user_id = event.from_user.id if isinstance(event, Message) else event.from_user.id
    
    if user_id not in SUPPORT_CHAT_IDS and user_id not in ADMIN_IDS:
        return

    debug_text = (
        "🛠️ <b>SOULDAWN SUPPORT · ИЗОЛИРОВАННАЯ ДЕБАГ-ПАНЕЛЬ</b>\n\n"
        "Это меню скрыто от клиентов и используется только для тестов.\n"
        "Выберите действие для имитации запросов:"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📥 Имитировать обращение с сайта", callback_data="debug:simulate_web")],
        [InlineKeyboardButton(text="🔄 Проверить статус БД (SELECT 1)", callback_data="debug:test_db")]
    ])
    
    if isinstance(event, CallbackQuery):
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)
        await event.answer()
    else:
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)


# ── ИМИТАЦИЯ НАЖАТИЯ КНОПКИ ОПЕРАТОРА ──
@router.callback_query(F.data == "ticket:call_operator")
async def call_operator_callback(callback: CallbackQuery, bot: Bot):
    await callback.message.answer("🔄 Вызываю живого оператора. Пожалуйста, опишите вашу проблему, мы уже бежим на помощь!")
    fake_message = callback.message
    fake_message.from_user = callback.from_user
    fake_message.text = "[Пользователь запросил человека через кнопку]"
    
    # Отправляем уведомление операторам с кнопкой ответа
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Ответить пользователю", callback_data=f"ticket:reply:manual_{callback.from_user.id}")]
    ])
    for op_id in SUPPORT_CHAT_IDS:
        try:
            await bot.send_message(chat_id=op_id, text=f"❓ <b>Пользователь @{callback.from_user.username} нажал кнопку вызова оператора в чате!</b>", parse_mode="HTML", reply_markup=kb)
        except Exception: pass
    await callback.answer()


# ── ХЕНДЛЕР НА ОБЫЧНЫЙ ТЕКСТ (ТУТ РАБОТАЕТ СИНХРОНИЗАЦИЯ ЧАТА МТС-СТАЙЛ) ──
@router.message(F.text & ~F.text.startswith("/"))
async def handle_support_message(message: Message, bot: Bot):
    tg_id = str(message.from_user.id)
    text = message.text

    async with aiohttp.ClientSession() as session:
        async with session.get(f"{API_BASE}/history?telegramId={tg_id}") as res:
            history_data = await res.json()
            tickets = history_data.get("tickets", [])
            open_ticket = next((t for t in tickets if t.get("status") == "open"), None)

        if open_ticket:
            payload = {"ticketId": open_ticket["id"], "sender": "user", "text": text}
            async with session.post(f"{API_BASE}/messages", json=payload): pass
            ticket_id = open_ticket["id"]
        else:
            payload = {"telegramId": tg_id, "category": "general", "message": text}
            async with session.post(f"{API_BASE}/create", json=payload) as create_res:
                create_data = await create_res.json()
                ticket_id = create_data.get("ticketId", "unknown")

    notification_text = (
        f"❓ <b>Новое обращение в поддержку!</b>\n\n"
        f"<b>Источник:</b> Telegram-Бот\n"
        f"<b>Пользователь:</b> @{message.from_user.username or '—'}\n"
        f"<b>ID тикета:</b> <code>{ticket_id}</code>\n\n"
        f"<b>Текст:</b> <i>{text}</i>"
    )
    
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Ответить пользователю", callback_data=f"ticket:reply:{ticket_id}")]
    ])

    for op_id in SUPPORT_CHAT_IDS:
        try:
            await bot.send_message(chat_id=op_id, text=notification_text, parse_mode="HTML", reply_markup=kb)
            await asyncio.sleep(0.05)
        except Exception as e:
            logger.warning(f"Failed to notify operator {op_id}: {e}")
