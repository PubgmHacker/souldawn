from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import aiohttp
import random
import logging
from config import ADMIN_IDS, SUPPORT_CHAT_IDS

router = Router()
logger = logging.getLogger("SOULDAWN.support")

class ReplyStates(StatesGroup):
    waiting_for_reply_text = State()

@router.message(Command("admin"))
async def open_admin_panel_support(message: Message):
    if message.from_user.id not in ADMIN_IDS and message.from_user.id not in SUPPORT_CHAT_IDS: 
        return
    admin_url = "https://railway.app"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Открыть Панель Ответов (Mini App)", web_app=WebAppInfo(url=admin_url))]
    ])
    await message.answer("🖥️ <b>SOULDAWN SUPPORT — Панель оператора тикетов:</b>", parse_mode="HTML", reply_markup=kb)

# ── ОБРАБОТКА НАЖАТИЯ НА КНОПКУ "ОТВЕТИТЬ ПОЛЬЗОВАТЕЛЮ" ──
@router.callback_query(F.data.startswith("ticket:reply:"))
async def handle_operator_reply_click(callback: CallbackQuery, state: FSMContext):
    ticket_id = callback.data.split(":")[-1]
    await state.update_data(ticket_id=ticket_id)
    await state.set_state(ReplyStates.waiting_for_reply_text)
    await callback.message.answer(f"✍️ <b>Введите текст ответа для тикета</b> <code>{ticket_id}</code>:\n(Сообщение синхронизируется везде)", parse_mode="HTML")
    await callback.answer()

@router.message(ReplyStates.waiting_for_reply_text)
async def process_operator_reply_text(message: Message, state: FSMContext):
    state_data = await state.get_data()
    ticket_id = state_data["ticket_id"]
    text = message.text
    await state.clear()

    async with aiohttp.ClientSession() as session:
        payload = {"ticketId": ticket_id, "sender": "operator", "text": text}
        async with session.post("https://railway.app", json=payload):
            pass

    await message.answer("✅ <b>Ответ успешно отправлен и синхронизирован везде!</b>", parse_mode="HTML")

# ── РАБОЧИЕ ОБРАБОТЧИКИ ДЛЯ ДЕБАГ-МЕНЮ С ОПЦИЕЙ ТГ-БОТА ──
@router.callback_query(F.data == "admin:debug_menu")
async def call_debug_menu_click(callback: CallbackQuery):
    debug_text = (
        "🛠️ <b>SOULDAWN SUPPORT · ДЕБАГ-ПАНЕЛЬ СИСТЕМЫ</b>\n\n"
        "Выберите нужное действие для проверки сквозных логов и тикетов:"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📥 Имитировать обращение с сайта", callback_data="debug:simulate_web")],
        [InlineKeyboardButton(text="🤖 Имитировать обращение с ТГ-бота", callback_data="debug:simulate_tg")],
        [InlineKeyboardButton(text="🔄 Проверить статус БД (SELECT 1)", callback_data="debug:test_db")]
    ])
    await callback.message.answer(debug_text, parse_mode="HTML", reply_markup=kb)
    await callback.answer()

@router.callback_query(F.data == "debug:simulate_web")
async def simulate_web_ticket(callback: CallbackQuery):
    fake_id = random.randint(100000, 999999)
    async with aiohttp.ClientSession() as session:
        payload = {"telegramId": "8340654471", "category": "order", "message": f"Тестовый запрос с сайта #{fake_id}. Проверка кнопок ответа."}
        async with session.post("https://railway.app", json=payload):
            pass
    await callback.message.answer(f"✅ Имитация обращения с сайта выполнена! Карточка тикета отправлена операторам.", parse_mode="HTML")
    await callback.answer()

@router.callback_query(F.data == "debug:simulate_tg")
async def simulate_tg_ticket(callback: CallbackQuery):
    fake_id = random.randint(100000, 999999)
    notification_text = (
        f"❓ <b>Новое обращение в поддержку!</b>\n\n"
        f"<b>Источник:</b> Telegram-Бот (Имитация)\n"
        f"<b>Пользователь:</b> @{callback.from_user.username or '—'}\n"
        f"<b>ID тикета:</b> <code>mock_{fake_id}</code>\n\n"
        f"<b>Текст:</b> <i>Тестовый вопрос напрямую из чата бота #{fake_id}</i>"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Ответить пользователю", callback_data=f"ticket:reply:mock_{fake_id}")]
    ])
    await callback.message.answer(notification_text, parse_mode="HTML", reply_markup=kb)
    await callback.answer()

@router.callback_query(F.data == "debug:test_db")
async def test_db_connection(callback: CallbackQuery):
    async with aiohttp.ClientSession() as session:
        async with session.get("https://railway.app") as res:
            status = "SUCCESS ✅" if res.status == 200 else "ERROR ❌"
            await callback.message.answer(f"🔄 <b>Статус подключения к бэкенду БД:</b> {status} (Код: {res.status})", parse_mode="HTML")
    await callback.answer()
