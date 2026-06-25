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
        "⚠️  <b>Не удалось отправить заказ</b>\n\n"
        "Произошла ошибка при обработке вашего заказа.\n"
        "Попробуйте позже или обратитесь в поддержку."
    )


def offline() -> str:
    return (


def sent_fail() -> str:
    return "⚠️  <b>Не удалось отправить заказ</b>

Произошла ошибка при обработке вашего заказа.
Попробуйте позже или обратитесь в поддержку."


def offline() -> str:
    return "🔴  <b>Сервис временно недоступен</b>

Оплата в данный момент невозможна.
Пожалуйста, попробуйте через несколько минут."
