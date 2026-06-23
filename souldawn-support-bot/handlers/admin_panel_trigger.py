from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import aiohttp
import logging
from config import ADMIN_IDS, SUPPORT_MINIAPP_URL

router = Router()
logger = logging.getLogger("SOULDAWN.support")

class ReplyStates(StatesGroup):
    waiting_for_reply_text = State()

@router.message(Command("admin"))
async def open_admin_panel_support(message: Message):
    if message.from_user.id not in ADMIN_IDS: return
    admin_url = "https://railway.app"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Открыть панель управления", web_app=WebAppInfo(url=admin_url))]
    ])
    await message.answer("🖥️ <b>SOULDAWN SUPPORT — Панель оператора тикетов:</b>", parse_mode="HTML", reply_markup=kb)

@router.callback_query(F.data.startswith("ticket:reply:"))
async def handle_operator_reply_click(callback: CallbackQuery, state: FSMContext):
    ticket_id = callback.data.split(":")[-1]
    await state.update_data(ticket_id=ticket_id)
    await state.set_state(ReplyStates.waiting_for_reply_text)
    await callback.message.answer(f"✍️ <b>Введите текст ответа для тикета</b> <code>{ticket_id}</code>:\n(Сообщение синхронизируется везде)", parse_mode="HTML")
    await callback.answer()

@router.message(ReplyStates.waiting_for_reply_text)
async def process_operator_reply_text(message: Message, state: FSMContext, bot: Bot):
    state_data = await state.get_data()
    ticket_id = state_data["ticket_id"]
    text = message.text
    await state.clear()

    # 1. Синхронизируем ответ с базой Next.js
    async with aiohttp.ClientSession() as session:
        payload = {"ticketId": ticket_id, "sender": "operator", "text": text}
        async with session.post("https://railway.app", json=payload) as res:
            pass
            
        # 2. Получаем Telegram ID пользователя, чтобы отправить ему уведомление в бот
        async with session.get(f"https://railway.app") as ticket_res:
            try:
                tickets_data = await ticket_res.json()
                # Находим нужный тикет в общей системе, чтобы узнать автора
                all_tickets = tickets_data.get("tickets", []) if isinstance(tickets_data, dict) else tickets_data
                target_ticket = next((t for t in all_tickets if str(t.get("id")) == str(ticket_id)), None)
                
                if target_ticket and target_ticket.get("user"):
                    user_tg_id = target_ticket["user"].get("telegram_id") or target_ticket["user"].get("telegramId")
                    
                    if user_tg_id:
                        # 3. Отправляем пользователю уведомление с кнопкой перехода в Mini App
                        user_kb = InlineKeyboardMarkup(inline_keyboard=[
                            [InlineKeyboardButton(text="⚡ ИСТОРИЯ ОБРАЩЕНИЙ", web_app=WebAppInfo(url=SUPPORT_MINIAPP_URL))]
                        ])
                        
                        notification_text = (
                            "🔔 <b>SOULDAWN SUPPORT · Поступил ответ!</b>\n\n"
                            "Менеджер службы поддержки ответил на ваше обращение.\n"
                            "Нажмите на кнопку ниже, чтобы открыть чат и продолжить диалог."
                        )
                        await bot.send_message(chat_id=int(user_tg_id), text=notification_text, parse_mode="HTML", reply_markup=user_kb)
            except Exception as err:
                logger.error(f"Failed to send alert to user: {err}")

    await message.answer("✅ <b>Ответ отправлен! Пользователю в бот прилетело уведомление о ответе со ссылкой на Mini App.</b>", parse_mode="HTML")
