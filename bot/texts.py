"""SOULDAWN — All text functions (no bot imports)."""
from __future__ import annotations

import time

from utils import _fmt_price


def welcome() -> str:
    h = time.localtime().tm_hour
    if 5 <= h < 12:
        g = "Доброе утро"
    elif 12 <= h < 17:
        g = "Добрый день"
    elif 17 <= h < 21:
        g = "Добрый вечер"
    else:
        g = "Доброй ночи"
    return (
        f"SOULDAWN\n\n"
        f"{g}! Я официальный бот проекта SOULDAWN — "
        f"уличный бренд одежды.\n\n"
        f"Здесь ты можешь посмотреть каталог, "
        f"оформить заказ и получить консультацию.\n\n"
        f"Выбери раздел ниже."
    )


def catalog_menu() -> str:
    return (
        "SOULDAWN · Каталог\n\n"
        "Выбери категорию или открой весь каталог."
    )


def info_menu() -> str:
    return (
        "SOULDAWN · Информация\n\n"
        "Доставка, возврат, размеры, оплата и качество."
    )


def links_menu() -> str:
    return (
        "SOULDAWN · Ссылки\n\n"
        "🌐  Сайт: souldawn.com\n"
        "📷  Instagram: @souldawnclothes\n"
        "🎵  TikTok: @souldawnclothes\n"
        "✈️  Telegram: @souldawnclothes\n"
        "📺  YouTube: @souldawnclothes\n\n"
        "Поддержка работает ежедневно 10:00–19:00."
    )


def profile_menu(user_data: dict | None = None) -> str:
    if user_data:
        name = user_data.get("name", "Пользователь")
        orders = user_data.get("order_count", 0)
        total = user_data.get("total_spent", 0)
        return (
            f"Привет, {name}\n\n"
            f"Заказов: {orders}\n"
            f"На сумму: {_fmt_price(total * 100) if total else '0 ₽'}\n\n"
            f"Полный профиль доступен на сайте."
        )
    return "Оформи первый заказ через мини-приложение или сайт."


def reviews_text() -> str:
    return "Читай реальные отзывы покупателей в нашем канале."


def faq_delivery() -> str:
    return (
        "SOULDAWN · Доставка\n\n"
        "СДЭК ПВЗ (пункт выдачи) — от 250₽, 2–5 рабочих дней\n"
        "СДЭК Курьер (до двери) — до 450₽, 2–5 рабочих дней\n"
        "Почта России — 7–14 рабочих дней\n\n"
        "Стоимость рассчитывается автоматически при оформлении заказа."
    )


def faq_returns() -> str:
    return (
        "SOULDAWN · Возврат\n\n"
        "14 дней на возврат с момента получения.\n"
        "Товар должен быть с бирками, без следов носки.\n\n"
        "1. Напиши нам в Telegram-бот или на почту\n"
        "2. Согласуем детали возврата\n"
        "3. Мы организуем возврат через СДЭК за наш счёт"
    )


def faq_sizes() -> str:
    return (
        "SOULDAWN · Таблица размеров\n\n"
        "S — грудь 106, длина 70\n"
        "M — грудь 112, длина 72\n"
        "L — грудь 118, длина 74\n"
        "XL — грудь 124, длина 76\n\n"
        "Крой оверсайз."
    )


def faq_payment() -> str:
    return (
        "SOULDAWN · Оплата\n\n"
        "Онлайн на сайте (банковская карта).\n"
        "Visa / MasterCard / МИР\n"
        "СБП (Система быстрых платежей)\n\n"
        "Все платежи защищены через YooKassa."
    )


def faq_quality() -> str:
    return (
        "SOULDAWN · Качество\n\n"
        "100% хлопок, плотность 220–400 г/м².\n"
        "Фурнитура YKK, двойные строчки.\n"
        "Стирка при 30°C."
    )


def faq_contact() -> str:
    return (
        "SOULDAWN · Контакты\n\n"
        "📱  Telegram: @souldawnsupport_bot\n"
        "📧  Почта: hello@souldawn.com\n"
        "🌐  Сайт: souldawn.com\n\n"
        "Ежедневно 10:00–19:00"
    )


def order_cmd() -> str:
    return "Напиши @souldawnsupport_bot для связи по заказу."


def pay_pending_text(total_kopecks: int, items_count: int) -> str:
    total = _fmt_price(total_kopecks)
    return (
        f"SOULDAWN · Оплата заказа\n\n"
        f"Товаров: {items_count} шт.\n"
        f"Итого: {total}\n\n"
        f"Нажми кнопку ниже для оплаты.\n"
        f"Ссылка активна 30 минут."
    )


def pay_confirmed_text(total_kopecks: int) -> str:
    return (
        f"SOULDAWN · Оплата подтверждена\n\n"
        f"Сумма: {_fmt_price(total_kopecks)}\n\n"
        f"Заказ передан оператору. Он свяжется с тобой в ближайшее время.\n\n"
        f"/start — вернуться в меню"
    )


def sent_fail() -> str:
    return (
        "\u26a0\ufe0f  <b>\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437</b>\n\n"
        "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0435 \u0432\u0430\u0448\u0435\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0430.\n"
        "\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435 \u0438\u043b\u0438 \u043e\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044c \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443."
    )

def offline() -> str:
    return (
        "\U0001f534  <b>\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d</b>\n\n"
        "\u041e\u043f\u043b\u0430\u0442\u0430 \u0432 \u0434\u0430\u043d\u043d\u044b\u0439 \u043c\u043e\u043c\u0435\u043d\u0442 \u043d\u0435\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0430.\n"
        "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043c\u0438\u043d\u0443\u0442."
    )
