"""SOULDAWN Support Bot — Diagnostic Center Core Engine."""
from __future__ import annotations
import asyncio
import logging
import random
import os
import time
import aiohttp
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import OPENAI_API_KEY, SUPPORT_CHAT_IDS, SUPPORT_MINIAPP_URL, ADMIN_IDS

router = Router()
logger = logging.getLogger("SOULDAWN.support")

class ReplyStates(StatesGroup):
    waiting_for_reply_text = State()

RAW_URL = os.getenv("MINIAPP_URL", "https://railway.app")
BASE_URL = RAW_URL.rstrip("/") + "/"

@router.message(CommandStart())
async def cmd_start_support(message: Message):
    user_id = message.from_user.id
    if user_id in SUPPORT_CHAT_IDS or user_id in ADMIN_IDS:
        admin_text = (
            "🖥️ <b>Добро пожаловать в Админ-Панель оператора SOULDAWN!</b>\n\n"
            "Вы авторизованы как менеджер службы поддержки. Используйте дебаг-панель для контроля работоспособности системы."
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="⚙️ Открыть Панель Ответов (Mini App)", web_app=WebAppInfo(url=BASE_URL + "admin"))],
            [InlineKeyboardButton(text="🛠️ Запустить Дебаг-Панель", callback_data="admin:debug_menu")]
        ])
        await message.answer(admin_text, parse_mode="HTML", reply_markup=kb)
        return

    welcome_text = "👋 <b>Добро пожаловать в службу поддержки SOULDAWN!</b>\n\nНапишите ваш вопрос прямо сюда."
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="📱 Открыть окно поддержки", web_app=WebAppInfo(url=SUPPORT_MINIAPP_URL))]])
    await message.answer(welcome_text, parse_mode="HTML", reply_markup=kb)

# ── 🛠️ ДЕБАГ-МЕНЮ С ОБЩЕЙ ДИАГНОСТИКОЙ ──
@router.message(Command("debug"))
@router.callback_query(F.data == "admin:debug_menu")
async def call_debug_menu_click(event: Message | CallbackQuery):
    message = event if isinstance(event, Message) else event.message
    debug_text = (
        "🛠️ <b>SOULDAWN SUPPORT · ЦЕНТР УПРАВЛЕНИЯ ТЕСТАМИ</b>\n\n"
        "Запустите автоматическую диагностику для выявления багов сериализации BigInt, ошибок роутинга и проблем CORS:"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚡ ЗАПУСТИТЬ ПОЛНУЮ ДИАГНОСТИКУ СИСТЕМЫ", callback_data="debug:run_full_scan")],
        [InlineKeyboardButton(text="📥 Имитировать тикет с сайта", callback_data="debug:simulate_web")],
        [InlineKeyboardButton(text="🤖 Имитировать тикет из ТГ", callback_data="debug:simulate_tg")]
    ])
    if isinstance(event, CallbackQuery):
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)
        await event.answer()
    else:
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)

# ── ⚡ МОДУЛЬ АВТОМАТИЧЕСКОЙ СЕКЦИОННОЙ ДИАГНОСТИКИ СИСТЕМЫ ──
@router.callback_query(F.data == "debug:run_full_scan")
async def run_full_system_scan(callback: CallbackQuery):
    status_msg = await callback.message.answer("⚙️ <b>Запуск сканирования ядра SOULDAWN Core...</b>\n<i>Пожалуйста, ожидайте сбора логов API...</i>", parse_mode="HTML")
    
    connector = aiohttp.TCPConnector(ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        # 1. Пинг контейнера Docker Next.js
        t0 = time.time()
        try:
            async with session.get(BASE_URL, timeout=3.0) as res:
                ping_time = round((time.time() - t0) * 1000)
                ping_status = f"🟢 ONLINE ({ping_time}ms) | HTTP {res.status}"
        except Exception as e:
            ping_status = f"🔴 OFFLINE / TIMEOUT | Ошибка: {type(e).__name__}"

        # 2. Проверка History API на BigInt/Prisma
        try:
            async with session.get(BASE_URL + "api/tickets/history?telegramId=8340654471", timeout=3.0) as res:
                res_text = await res.text()
                if res.status == 200:
                    history_status = "🟢 SUCCESS (200 OK) | Спецификация BigInt/Prisma стабильна"
                else:
                    history_status = f"🔴 ERROR (HTTP {res.status}) | Падение сериализации БД:\n<code>{res_text[:120]}</code>"
        except Exception as e:
            history_status = f"🚨 СБОЙ МАРШРУТА | Сетевой сброс: {type(e).__name__}"

        # 3. Проверка Create API на UUID/Int генерацию колонок
        try:
            payload = {"telegramId": "8340654471", "category": "debug_scan", "message": "Автоматическая диагностика"}
            async with session.post(BASE_URL + "api/tickets/create", json=payload, timeout=3.0) as res:
                res_text = await res.text()
                if res.status == 200:
                    create_status = "🟢 SUCCESS (200 OK) | Запись тикетов и авторегистрация работают"
                else:
                    create_status = f"🔴 CRITICAL (HTTP {res.status}) | Баг автоинкремента/UUID:\n<code>{res_text[:120]}</code>"
        except Exception as e:
            create_status = f"🚨 СБОЙ ЗАПИСИ | Исключение: {type(e).__name__}"

    # Собираем красивую ультимативную карту диагностики
    report = (
        "📋 <b>ОТЧЁТ О ДИАГНОСТИКЕ СИСТЕМЫ SOULDAWN</b>\n"
        "====================================\n\n"
        f"🌐 <b>1. Статус веб-сервера (Пинг):</b>\n{ping_status}\n\n"
        f"🔍 <b>2. Доступ к БД (History API):</b>\n{history_status}\n\n"
        f"📥 <b>3. Создание заявок (Create API):</b>\n{create_status}\n\n"
        "====================================\n"
        "⚙️ <i>Рекомендация: Если статус красный, проверьте соответствие переменных MINIAPP_URL текущему домену Railway.</i>"
    )
    
    await status_msg.edit_text(report, parse_mode="HTML")
    await callback.answer()

# ── ОСТАЛЬНЫЕ ДЕБАГ-КНОПКИ ИМИТАЦИИ И ОТВЕТОВ ──
@router.callback_query(F.data == "debug:simulate_web")
async def simulate_web_ticket(callback: CallbackQuery):
    fake_id = str(random.randint(100000, 999999))
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
        payload = {"telegramId": "8340654471", "category": "order", "message": "Тестовый запрос с сайта #" + fake_id}
        await session.post(BASE_URL + "api/tickets/create", json=payload)
    await callback.message.answer("✅ Имитация обращения с сайта выполнена через API!", parse_mode="HTML")
    await callback.answer()

@router.callback_query(F.data == "debug:simulate_tg")
async def simulate_tg_ticket(callback: CallbackQuery):
    fake_id = str(random.randint(100000, 999999))
    notification_text = "❓ <b>Новое обращение!</b>\n\n<b>Источник:</b> ТГ-Бот\n<b>ID тикета:</b> <code>tg_" + fake_id + "</code>\n\n<b>Текст:</b> <i>Тестовый вопрос из чата ТГ-бота</i>"
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="💬 Ответить пользователю", callback_data="ticket:reply:tg_" + fake_id)]])
    await callback.message.answer(notification_text, parse_mode="HTML", reply_markup=kb)
    await callback.answer()

@router.callback_query(F.data.startswith("ticket:reply:"))
async def handle_operator_reply_click(callback: CallbackQuery, state: FSMContext):
    ticket_id = callback.data.split(":")[-1]
    await state.update_data(ticket_id=ticket_id)
    await state.set_state(ReplyStates.waiting_for_reply_text)
    await callback.message.answer(f"✍️ <b>Введите текст ответа для тикета</b> <code>{ticket_id}</code>:", parse_mode="HTML")
    await callback.answer()

@router.message(ReplyStates.waiting_for_reply_text)
async def process_operator_reply_text(message: Message, state: FSMContext):
    state_data = await state.get_data()
    ticket_id = state_data["ticket_id"]
    text = message.text
    await state.clear()
    async with aiohttp.ClientSession() as session:
        payload = {"ticketId": ticket_id, "sender": "operator", "text": text}
        await session.post(BASE_URL + "api/tickets/messages", json=payload)
        await session.post(BASE_URL + "api/admin/tickets/" + str(ticket_id) + "/reply", json={"reply": text})
    await message.answer("✅ <b>Ответ успешно отправлен и заархивирован везде!</b>", parse_mode="HTML")

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
    notification_text = f"❓ <b>Новое обращение в поддержку!</b>\n\n<b>Источник:</b> Telegram-Бот\n<b>ID тикета:</b> <code>{ticket_id}</code>\n\n<b>Текст:</b> <i>{text}</i>"
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="💬 Ответить пользователю", callback_data=f"ticket:reply:{ticket_id}")]])
    for op_id in SUPPORT_CHAT_IDS:
        try: await bot.send_message(chat_id=op_id, text=notification_text, parse_mode="HTML", reply_markup=kb)
        except Exception: pass
