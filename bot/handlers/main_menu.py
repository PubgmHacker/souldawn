"""SOULDAWN — Main menu handlers: /start, /help, /catalog, navigation."""
from __future__ import annotations

from aiogram import Router, F
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto,
)
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext

from config import MINIAPP_URL, FAQ_MINIAPP_URL
from database import get_or_create_user
from utils import BANNERS
from texts import welcome, order_cmd
from keyboards import main_kb, back_kb

router = Router()


# ── Helper ──
async def _edit(callback, banner_type: str, caption: str, kb=None) -> None:
    try:
        await callback.message.edit_media(
            InputMediaPhoto(media=BANNERS[banner_type], caption=caption),
            reply_markup=kb,
        )
    except Exception:
        try:
            await callback.message.delete()
        except Exception:
            pass
        await callback.message.answer_photo(
            photo=BANNERS[banner_type], caption=caption, reply_markup=kb,
        )


# ── Commands ──
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    user = message.from_user
    if user:
        await get_or_create_user(user.id, user.username or "", user.first_name or "")
    await message.answer_photo(photo=BANNERS["welcome"], caption=welcome(), reply_markup=main_kb())


@router.message(Command("help"))
async def cmd_help(message: Message, state: FSMContext):
    await state.clear()
    await message.answer_photo(photo=BANNERS["welcome"], caption=welcome(), reply_markup=main_kb())


@router.message(Command("catalog"))
async def cmd_catalog(message: Message, state: FSMContext):
    await state.clear()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒  Открыть каталог", web_app=WebAppInfo(url=MINIAPP_URL))],
        [InlineKeyboardButton(text="←  Меню", callback_data="back_to_menu")],
    ])
    await message.answer_photo(photo=BANNERS["catalog"], caption="SOULDAWN · Каталог\n\nВыбери категорию или открой весь каталог.", reply_markup=kb)


@router.message(Command("sizes"))
async def cmd_sizes(message: Message, state: FSMContext):
    await state.clear()
    # Открываем FAQ миниапп с разделом размеров
    if FAQ_MINIAPP_URL:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📏  Таблица размеров", web_app=WebAppInfo(url=f"{FAQ_MINIAPP_URL}#sizes"))],
            [InlineKeyboardButton(text="←  Меню", callback_data="back_to_menu")],
        ])
    else:
        kb = back_kb()
    await message.answer("Размеры доступны в FAQ мини-приложении.", reply_markup=kb)


@router.message(Command("order"))
async def cmd_order(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(order_cmd(), reply_markup=main_kb())


@router.message(Command("faq"))
async def cmd_faq(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("❓ Все ответы — в FAQ", reply_markup=main_kb())


# ── Callbacks ──
@router.callback_query(F.data == "noop")
async def on_noop(callback: CallbackQuery):
    await callback.answer()


@router.callback_query(F.data == "back_to_menu")
async def on_back(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await _edit(callback, "welcome", welcome(), main_kb())
    await callback.answer()


# ── Errors ──
@router.error()
async def on_error(event):
    import logging
    logging.getLogger("SOULDAWN").error(f"Error: {event.exception}", exc_info=event.exception)
