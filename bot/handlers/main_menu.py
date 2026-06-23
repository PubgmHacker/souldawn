"""SOULDAWN — Main menu handlers: /start, /help, /catalog, FAQ, navigation."""
from __future__ import annotations

from aiogram import Router, F
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto,
)
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext

from config import MINIAPP_URL, SITE_URL
from database import get_or_create_user
from utils import BANNERS
from texts import (
    welcome, catalog_menu, info_menu, support_menu, links_menu,
    faq_delivery, faq_returns, faq_sizes, faq_payment, faq_quality,
    faq_contact, order_cmd,
)
from keyboards import main_kb, faq_menu_kb, faq_article_kb, support_kb, back_kb, FAQ_ITEMS

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
        [InlineKeyboardButton(text="🌐  Каталог на сайте", url=f"{SITE_URL}/collection")],
        [InlineKeyboardButton(text="←  Меню", callback_data="back_to_menu")],
    ])
    await message.answer_photo(photo=BANNERS["catalog"], caption=catalog_menu(), reply_markup=kb)


@router.message(Command("sizes"))
async def cmd_sizes(message: Message, state: FSMContext):
    await state.clear()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="←  Меню", callback_data="back_to_menu")],
    ])
    await message.answer(faq_sizes(), reply_markup=kb)


@router.message(Command("order"))
async def cmd_order(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(order_cmd(), reply_markup=main_kb())


# ── Callbacks ──
@router.callback_query(F.data == "noop")
async def on_noop(callback: CallbackQuery):
    await callback.answer()


@router.callback_query(F.data == "back_to_menu")
async def on_back(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await _edit(callback, "welcome", welcome(), main_kb())
    await callback.answer()


@router.callback_query(F.data.in_({"menu:info", "menu:faq"}))
async def on_faq_menu(callback: CallbackQuery):
    """Главное меню FAQ — список статей."""
    text = (
        "📋  <b>FAQ — Частые вопросы</b>\n\n"
        "Выберите интересующую вас тему ниже, чтобы узнать подробности:"
    )
    await _edit(callback, "info", text, info_kb())
    await callback.answer()
ы


@router.callback_query(F.data == "menu:support")
async def on_support(callback: CallbackQuery):
    await _edit(callback, "support", support_menu(), support_kb())
    await callback.answer()


@router.callback_query(F.data == "menu:links")
async def on_links(callback: CallbackQuery):
    await _edit(callback, "links", links_menu(), back_kb())
    await callback.answer()


@router.callback_query(F.data == "order")
async def on_order(callback: CallbackQuery):
    await _edit(callback, "order", order_cmd(), back_kb())
    await callback.answer()


# ── FAQ статьи ──
# Ключ → (функция-текст, баннер)
FAQ_HANDLERS: dict[str, tuple] = {
    "delivery": (faq_delivery, "delivery"),
    "returns":  (faq_returns,  "returns"),
    "sizes":    (faq_sizes,    "sizes"),
    "payment":  (faq_payment,  "payment"),
    "quality":  (faq_quality,  "quality"),
    "contact":  (faq_contact,  "contact"),
    "brand":    (lambda: (
        "\U0001F319  <b>SOULDAWN — Рассвет после боя</b>\n\n"
        "Мы не придумали эту борьбу. Мы просто решили показать её.\n\n"
        "SOULDAWN — это спорт. Как характер. Как действие. Как состояние.\n\n"
        "\U0001F4E6  Коллекция «Ангел vs Демон» — 4 принта, каждый рассказывает историю.\n"
        "\U0001F319  Дихотомия тёмного/светлого = Демон/Ангел.\n"
        "\U0001F305  Рассвет после боя — наш слоган."
    ), "info"),
    "site": (lambda: (
        f"\U0001F310  <b>Наш сайт</b>\n\n"
        f"Полный каталог, оформление заказа и личный кабинет — на сайте.\n\n"
        f"\U0001F517  <a href='{SITE_URL}'>{SITE_URL}</a>\n\n"
        f"\U0001F6CD\uFE0F  Каталог: <a href='{SITE_URL}/collection'>{SITE_URL}/collection</a>\n"
        f"\U0001F464  Личный кабинет: <a href='{SITE_URL}/dashboard'>{SITE_URL}/dashboard</a>"
    ), "links"),
}


@router.callback_query(F.data.startswith("faq:"))
async def on_faq(callback: CallbackQuery):
    key = callback.data.split(":", 1)[1]
    entry = FAQ_HANDLERS.get(key)
    if not entry:
        await callback.answer()
        return
    fn, banner = entry
    await _edit(callback, banner, fn(), faq_article_kb(key))
    await callback.answer()


# ── Errors ──
@router.error()
async def on_error(event):
    import logging
    logging.getLogger("SOULDAWN").error(f"Error: {event.exception}", exc_info=event.exception)
