from aiogram import Router
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.filters import Command
import os

router = Router()

@router.message(Command("admin"))
async def open_admin_panel(message: Message):
    RAW_URL = os.getenv("MINIAPP_URL", "https://railway.app")
    base_url = RAW_URL.rstrip("/") + "/"
    admin_url = base_url + "admin"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Открыть панель управления", web_app=WebAppInfo(url=admin_url))]
    ])
    await message.answer("🖥️ <b>SOULDAWN — Вход в панель администратора:</b>", parse_mode="HTML", reply_markup=kb)
