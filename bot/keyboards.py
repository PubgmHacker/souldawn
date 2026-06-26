from __future__ import annotations

"""SOULDAWN — All keyboard builders."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import MINIAPP_URL, SITE_URL
from utils import _fmt_price


def main_kb() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []

    # Кнопка каталога (WebApp) — главный CTA, отдельной широкой строкой.
    # Показываем только при заданном MINIAPP_URL — иначе Telegram
    # отклоняет всю клавиатуру (Web App URL host is empty).
    if MINIAPP_URL:
        rows.append([InlineKeyboardButton(text="🛍️  МАГАЗИН", web_app=WebAppInfo(url=MINIAPP_URL))])

    # Кнопка Сайт (url) только при заданном SITE_URL — иначе пустой url
    # делает кнопку невалидной (Text buttons are unallowed).
    info_row = []
    if SITE_URL:
        info_row.append(InlineKeyboardButton(text="🌐  Сайт", url=SITE_URL))
    info_row.append(InlineKeyboardButton(text="ℹ️  Инфо", callback_data="menu:info"))
    rows.append(info_row)

    rows.append([
        InlineKeyboardButton(text="💬  Поддержка", callback_data="menu:support"),
        InlineKeyboardButton(text="🔗  Ссылки", callback_data="menu:links"),
    ])

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
                web_app=WebAppInfo(url=f"{MINIAPP_URL.rstrip(chr(47))}/admin"),
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


def support_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🤖  AI-ассистент", callback_data="ai:ask"),
            InlineKeyboardButton(text="💬  Оператор", callback_data="operator"),
        ],
        [
            InlineKeyboardButton(text="📦  Мой заказ", callback_data="order"),
            InlineKeyboardButton(text="📞  Контакты", callback_data="faq:contact"),
        ],
        [InlineKeyboardButton(text="←  Назад", callback_data="back_to_menu")],
    ])


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