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
        f"Каталог · Оплата · Поддержка — всё внизу."
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


def operator_ask() -> str:
    return (
        "SOULDAWN · Поддержка\n\n"
        "Напиши свой вопрос — мы перешлём оператору.\n"
        "Ответ в течение 1 часа.\n\n"
        "/start — отмена"
    )


def confirm_send(text: str) -> str:
    p = text[:200] + ("..." if len(text) > 200 else "")
    return (
        f"SOULDAWN · Твоё сообщение:\n\n"
        f"«{p}»\n\n"
        f"Отправить оператору?"
    )


def sent_ok() -> str:
    return "Отправлено. Оператор ответит в ближайшее время."


def sent_fail() -> str:
    return "Не удалось отправить. Попробуй позже."


def offline() -> str:
    return "Оператор не на связи. Попробуй позже."


def order_cmd() -> str:
    return "Напиши @souldawn_support для связи по заказу."


def ai_ask_text() -> str:
    return (
        "SOULDAWN · AI-ассистент\n\n"
        "Напиши вопрос — AI ответит мгновенно.\n"
        "Помогает с товарами, размерами, доставкой.\n\n"
        "/start — отмена"
    )


def ai_answer(q: str, a: str) -> str:
    return f"Вопрос: {q}\n\nОтвет: {a}\n\nПомог?"


def ai_handoff(q: str) -> str:
    return (
        f"SOULDAWN · Нужен оператор\n\n"
        f"«{q[:200]}»\n\n"
        f"Передаём оператору..."
    )


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
