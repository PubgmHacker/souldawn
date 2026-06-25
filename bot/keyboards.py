from __future__ import annotations
"""SOULDAWN — All keyboard builders."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import MINIAPP_URL, SITE_URL
from utils import _fmt_price


def main_kb() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []

    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(text="🛍️  МАГАЗИН", web_app=WebAppInfo(url=MINIAPP_URL))])
        rows.append([InlineKeyboardButton(text="❓ FAQ", web_app=WebAppInfo(url=f"{MINIAPP_URL}/faq"))])

    info_row = []
    if SITE_URL:
        info_row.append(InlineKeyboardButton(text="🌐  Сайт", url=SITE_URL))
    info_row.append(InlineKeyboardButton(text="❓  FAQ", callback_data="menu:info"))
    rows.append(info_row)

    rows.append([
        InlineKeyboardButton(text="💬  Поддержка", url="https://t.me/souldawnsupport_bot"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_panel_kb() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = [
        [
            InlineKeyboardButton(text="📊  Статистика", callback_data="admin:stats"),
            InlineKeyboardButton(text="🟢  Онлайн", callback_data="admin:online"),
        ],
        [
            InlineKeyboardButton(text="📦  Заказы", callback_data="admin:orders"),
            InlineKeyboardButton(text="🎫  Тикеты", callback_data="admin:tickets"),
        ],
        [
            InlineKeyboardButton(text="📣  Рассылка", callback_data="admin:broadcast"),
            InlineKeyboardButton(text="💰  Расходы", callback_data="admin:expenses"),
        ],
    ]
    if MINIAPP_URL:
        rows.append([
            InlineKeyboardButton(
                text="🖥  Открыть полную панель",
                web_app=WebAppInfo(url=f"{MINIAPP_URL}?view=admin"),
            )
        ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_back_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="←  К панели", callback_data="admin:home")]
    ])


def shop_or_menu_kb() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(text="SHOP", web_app=WebAppInfo(url=MINIAPP_URL))])
    rows.append([InlineKeyboardButton(text="MENU", callback_data="back_to_menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def info_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📦  Доставка", callback_data="faq:delivery"),
            InlineKeyboardButton(text="🔄  Возврат", callback_data="faq:returns"),
        ],
        [
            InlineKeyboardButton(text="📏  Размеры", callback_data="faq:sizes"),
            InlineKeyboardButton(text="💳  Оплата", callback_data="faq:payment"),
        ],
        [
            InlineKeyboardButton(text="✅  Качество", callback_data="faq:quality"),
            InlineKeyboardButton(text="📞  Контакты", callback_data="faq:contact"),
        ],
        [InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")],
    ])


def back_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")]
    ])


def pay_kb(confirmation_url: str, total_kopecks: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"💳  Оплатить {_fmt_price(total_kopecks)}", url=confirmation_url)],
        [InlineKeyboardButton(text="🔄  Проверить оплату", callback_data="check_payment")],
        [InlineKeyboardButton(text="❌  Отмена", callback_data="back_to_menu")],
    ])


def _stats_back_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад", callback_data="stats:main")]
    ])


def _stats_main_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Обзор", callback_data="stats:overview"),
         InlineKeyboardButton(text="💰 Финансы", callback_data="stats:finance")],
        [InlineKeyboardButton(text="📦 Заказы", callback_data="stats:orders"),
         InlineKeyboardButton(text="👥 Пользователи", callback_data="stats:users")],
        [InlineKeyboardButton(text="🟢 Онлайн", callback_data="stats:online"),
         InlineKeyboardButton(text="📋 Расходы", callback_data="stats:expenses")],
    ])


# ======================== FAQ ========================
# ======================== FAQ KEYBOARDS ========================
FAQ_ITEMS = {
    "delivery": "📦 Доставка",
    "returns": "🔄 Возврат",
    "sizes": "📐 Размеры",
    "payment": "💳 Оплата",
    "quality": "💎 Качество",
    "contact": "📱 Контакты"
}

def faq_menu_kb() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for key, text in FAQ_ITEMS.items():
        builder.row(InlineKeyboardButton(text=text, callback_data=f"faq:{key}"))
    builder.row(InlineKeyboardButton(text="← Назад", callback_data="back_to_menu"))
    return builder.as_markup()

def faq_article_kb(current_key: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="← К списку FAQ", callback_data="menu:faq"))
    builder.row(InlineKeyboardButton(text="🏠 В главное меню", callback_data="back_to_menu"))
    return builder.as_markup()
