from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import aiohttp
import random
import os
from config import ADMIN_IDS, SUPPORT_CHAT_IDS

router = Router()

class ReplyStates(StatesGroup):
    waiting_for_reply_text = State()

RAW_URL = os.getenv("MINIAPP_URL", "https://railway.app")
BASE_URL = RAW_URL.rstrip("/") + "/"

@router.message(Command("admin"))
async def open_admin_panel_support(message: Message):
    admin_url = BASE_URL + "admin"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Панель Управления (Mini App)", web_app=WebAppInfo(url=admin_url))]
    ])
    await message.answer("🖥️ <b>SOULDAWN — Панель оператора тикетов:</b>", parse_mode="HTML", reply_markup=kb)

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
        await session.post(BASE_URL + f"api/admin/tickets/{ticket_id}/reply", json={"reply": text})
    await message.answer("✅ <b>Ответ успешно отправлен и заархивирован!</b>", parse_mode="HTML")

@router.message(Command("debug"))
@router.callback_query(F.data == "admin:debug_menu")
async def call_debug_menu_click(event: Message | CallbackQuery):
    message = event if isinstance(event, Message) else event.message
    debug_text = "🛠️ <b>SOULDAWN SUPPORT · ИЗОЛИРОВАННАЯ ДЕБАГ-ПАНЕЛЬ</b>\n\nВыберите действие для тестов:"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📥 Имитировать обращение с сайта", callback_data="debug:simulate_web")],
        [InlineKeyboardButton(text="🤖 Имитировать обращение с ТГ-бота", callback_data="debug:simulate_tg")],
        [InlineKeyboardButton(text="🔄 Проверить статус БД (SELECT 1)", callback_data="debug:test_db")]
    ])
    if isinstance(event, CallbackQuery):
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)
        await event.answer()
    else:
        await message.answer(debug_text, parse_mode="HTML", reply_markup=kb)

@router.callback_query(F.data == "debug:simulate_web")
async def simulate_web_ticket(callback: CallbackQuery):
    fake_id = str(random.randint(100000, 999999))
    async with aiohttp.ClientSession() as session:
        payload = {"telegramId": "8340654471", "category": "order", "message": "Тестовый запрос с сайта #" + fake_id}
        await session.post(BASE_URL + "api/tickets/create", json=payload)
    await callback.message.answer("✅ Имитация обращения с сайта выполнена через API!", parse_mode="HTML")
    await callback.answer()

@router.callback_query(F.data == "debug:simulate_tg")
async def simulate_tg_ticket(callback: CallbackQuery):
    fake_id = str(random.randint(100000, 999999))
    notification_text = "❓ <b>Новое обращение в поддержку!</b>\n\n<b>Источник:</b> Telegram-Бот (Имитация)\n<b>ID тикета:</b> <code>tg_" + fake_id + "</code>\n\n<b>Текст:</b> <i>Тестовый вопрос напрямую из чата ТГ-бота</i>"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Ответить пользователю", callback_data="ticket:reply:tg_" + fake_id)]
    ])
    await callback.message.answer(notification_text, parse_mode="HTML", reply_markup=kb)
    await callback.answer()

@router.callback_query(F.data == "debug:test_db")
async def test_db_connection(callback: CallbackQuery):
    async with aiohttp.ClientSession() as session:
        async with session.get(BASE_URL + "api/tickets/history?telegramId=8340654471") as res:
            status = "SUCCESS ✅" if res.status == 200 else "ERROR ❌"
            await callback.message.answer("🔄 <b>Статус подключения к бэкенду БД:</b> " + status, parse_mode="HTML")
    await callback.answer()
