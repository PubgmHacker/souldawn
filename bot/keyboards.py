"""SOULDAWN — All keyboard builders."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import MINIAPP_URL, FAQ_MINIAPP_URL, SUPPORT_BOT_URL
from utils import _fmt_price


def main_kb() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []

    # Кнопка каталога (WebApp) — главный CTA, отдельной широкой строкой.
    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(text="🛍️  КАТАЛОГ", web_app=WebAppInfo(url=MINIAPP_URL))])

    # FAQ (WebApp) + Поддержка (инлайн ссылка на саппорт-бот)
    bottom_row = []
    if FAQ_MINIAPP_URL:
        bottom_row.append(InlineKeyboardButton(text="❓  FAQ", web_app=WebAppInfo(url=FAQ_MINIAPP_URL)))
    if SUPPORT_BOT_URL:
        bottom_row.append(InlineKeyboardButton(text="💬  Поддержка", url=SUPPORT_BOT_URL))
    if bottom_row:
        rows.append(bottom_row)

    return InlineKeyboardMarkup(inline_keyboard=rows)


def admin_panel_kb() -> InlineKeyboardMarkup:
    """Инлайн админ-панель (вызывается по /admin). WebApp-кнопка —
    только при заданном MINIAPP_URL, иначе Telegram отклоняет клавиатуру."""
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
    """Кнопка «Назад» в корень админ-панели."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="←  К панели", callback_data="admin:home")]
    ])


def shop_or_menu_kb() -> InlineKeyboardMarkup:
    """Клавиатура после оплаты/заказа. Кнопка SHOP (WebApp) — только
    при заданном MINIAPP_URL, иначе Telegram отклоняет клавиатуру."""
    rows: list[list[InlineKeyboardButton]] = []
    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(text="КАТАЛОГ", web_app=WebAppInfo(url=MINIAPP_URL))])
    rows.append([InlineKeyboardButton(text="MENU", callback_data="back_to_menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def support_kb() -> InlineKeyboardMarkup:
    """Поддержка — перенаправление на саппорт-бот."""
    rows: list[list[InlineKeyboardButton]] = []
    if SUPPORT_BOT_URL:
        rows.append([InlineKeyboardButton(text="💬  Написать в поддержку", url=SUPPORT_BOT_URL)])
    rows.append([InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def back_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")]
    ])


def operator_confirm_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅  Отправить", callback_data="confirm_operator")],
        [InlineKeyboardButton(text="❌  Отмена", callback_data="back_to_menu")],
    ])


def ai_helpful_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅  Спасибо!", callback_data="ai:thanks")],
        [InlineKeyboardButton(text="💬  Оператор", callback_data="operator")],
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
