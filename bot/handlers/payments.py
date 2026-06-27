"""SOULDAWN — Payment handlers: YooKassa webhook, miniapp orders, payment check."""
from __future__ import annotations

import asyncio
import json
import time
import logging

from aiogram import Router, F, Bot
from aiogram.types import (
    Message, CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto,
)
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext

from config import (
    BOT_TOKEN, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL,
    YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, SUPPORT_CHAT_ID, MINIAPP_URL,
    WEBHOOK_SECRET, PRODUCT_PRICES_KOPECKS, PROMO_CODES,
)
from database import (
    get_or_create_user, save_user_cart, save_order,
    get_user_cart, get_full_stats,
    get_paid_unnotified_orders, mark_order_processing,
)
from utils import BANNERS, _fmt_price
from texts import welcome, sent_fail, offline, pay_pending_text, pay_confirmed_text
from keyboards import main_kb, pay_kb, shop_or_menu_kb
from services.yookassa import create_yookassa_payment, check_yookassa_payment

logger = logging.getLogger("SOULDAWN")
router = Router()

# ======================== PENDING ORDERS ========================
# Краткоживущий кэш для кнопки "Проверить оплату" (polling fallback).
# ИСТОЧНИК ИСТИНЫ по оплате — БД (status заказа), куда Next.js webhook пишет 'paid'.
pending_orders: dict = {}
# ===============================================================


async def poll_paid_orders(bot: Bot) -> None:
    """Фоновая задача: подтверждает оплаченные заказы из БД.

    Next.js webhook ставит status='paid'. Здесь мы находим такие заказы,
    уведомляем покупателя и оператора, и переводим в 'processing'
    (атомарно — ровно одно уведомление на заказ).
    """
    while True:
        await asyncio.sleep(15)
        try:
            orders = await get_paid_unnotified_orders()
        except Exception as e:
            logger.error(f"poll_paid_orders: query failed: {e}")
            continue

        for order in orders:
            order_id = order["id"]
            # Атомарно забираем заказ — если не выиграли гонку, пропускаем.
            if not await mark_order_processing(order_id):
                continue

            total = order.get("total", 0)
            contact = order.get("contact") or {}
            items = order.get("items") or []

            # Уведомить оператора.
            if SUPPORT_CHAT_ID:
                lines = []
                for i, it in enumerate(items, 1):
                    nm = it.get("name", it.get("id", "?"))
                    qty = it.get("qty", 1)
                    lines.append(f"{i}. {nm} x{qty}")
                try:
                    await bot.send_message(
                        SUPPORT_CHAT_ID,
                        f"SOULDAWN · Оплаченный заказ #{order_id[:8]}\n\n"
                        + "\n".join(lines)
                        + f"\n\nСумма: {_fmt_price(total)}\n"
                        f"Телефон: {contact.get('phone', '—')}\n"
                        f"Имя: {contact.get('name', '—')}",
                    )
                except Exception as e:
                    logger.error(f"poll_paid_orders: operator notify failed: {e}")

            # Уведомить покупателя (только для Telegram-заказов с известным telegram_id в contact).
            buyer_tg = contact.get("telegram_id")
            if buyer_tg:
                try:
                    from texts import pay_confirmed_text
                    await bot.send_message(int(buyer_tg), pay_confirmed_text(total))
                except Exception as e:
                    logger.error(f"poll_paid_orders: buyer notify failed: {e}")

            logger.info(f"poll_paid_orders: confirmed order {order_id[:8]} ({_fmt_price(total)})")


# ── /debug ──
@router.message(Command("debug"))
async def cmd_debug(message: Message):
    from aiohttp import ClientSession, ClientTimeout
    lines = ["Diagnostics\n"]

    if not OPENAI_API_KEY:
        lines.append("AI: key not set")
    else:
        try:
            async with ClientSession() as s:
                async with s.get(
                    f"{OPENAI_BASE_URL}/models",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    timeout=ClientTimeout(total=10),
                ) as r:
                    if r.status == 200:
                        body = await r.json()
                        models = [m["id"] for m in body.get("data", []) if "gpt" in m["id"]]
                        has_model = any(OPENAI_MODEL in m for m in models)
                        lines.append(f"AI: OK model {OPENAI_MODEL} {'found' if has_model else 'NOT FOUND'}")
                    else:
                        lines.append(f"AI: HTTP {r.status}")
        except Exception as e:
            lines.append(f"AI: {type(e).__name__}: {e}")

    if YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY:
        lines.append(f"YooKassa: OK shop_id={YOOKASSA_SHOP_ID[:6]}...")
    else:
        lines.append("YooKassa: not configured")

    lines.append(f"Pending orders: {len(pending_orders)}")
    await message.answer("\n".join(lines))


# ── Check payment (polling fallback) ──
@router.callback_query(F.data == "check_payment")
async def on_check_payment(callback: CallbackQuery, bot: Bot):
    user_id = callback.from_user.id
    found = None
    for pid, order in pending_orders.items():
        if order["user_id"] == user_id and order["status"] == "pending":
            found = (pid, order)
            break

    if not found:
        await callback.answer("No active orders found", show_alert=True)
        return

    payment_id, order = found
    result = await check_yookassa_payment(payment_id)

    if result and result.get("status") == "succeeded":
        order["status"] = "succeeded"
        await _order_confirmed(bot, callback, order)
    elif result and result.get("status") in ("canceled", "waiting_for_capture"):
        await callback.answer(f"Status: {result['status']}", show_alert=True)
    else:
        await callback.answer("Payment not yet received. Try in a minute.", show_alert=True)


async def _order_confirmed(bot: Bot, callback_or_message, order: dict) -> None:
    user_id = order["user_id"]
    username = order.get("username", "")
    items = order["items"]
    total_kopecks = order["total_kopecks"]
    contact = order.get("contact", {})
    payment_method = order.get("payment_method", "unknown")

    lines = []
    for i, it in enumerate(items, 1):
        name = it.get("name", it.get("id", "?"))
        qty = it.get("qty", 1)
        price = it.get("price", 0)
        lines.append(f"{i}. {name} x{qty} - {_fmt_price(price)}")

    method_names = {"card": "Card", "sbp": "SBP", "wallet": "Telegram Wallet"}
    method_str = method_names.get(payment_method, payment_method)
    phone = contact.get("phone", "—")
    name = contact.get("name", "—")

    order_text = (
        f"SOULDAWN · Paid order\n\n"
        f"Buyer: {order.get('display_name', '—')} · ID: {user_id}\n"
        f"Username: {username}\n\n"
        f"Items:\n" + "\n".join(lines) + f"\n\n"
        f"Total: {_fmt_price(total_kopecks)}\n"
        f"Method: {method_str}\n\n"
        f"Phone: {phone}\n"
        f"Name: {name}\n\n"
        f"Payment confirmed via YooKassa"
    )

    if SUPPORT_CHAT_ID:
        try:
            await bot.send_message(
                SUPPORT_CHAT_ID,
                order_text,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="REPLY", url=f"tg://user?id={user_id}")
                ]]),
            )
            logger.info(f"Order {user_id} forwarded to operator (payment confirmed)")
        except Exception as e:
            logger.error(f"Error forwarding order: {e}")

    try:
        if isinstance(callback_or_message, CallbackQuery):
            await callback_or_message.message.edit_media(
                InputMediaPhoto(
                    media=BANNERS["pay_ok"],
                    caption=pay_confirmed_text(total_kopecks),
                ),
                reply_markup=shop_or_menu_kb(),
            )
        else:
            await callback_or_message.answer_photo(
                photo=BANNERS["pay_ok"],
                caption=pay_confirmed_text(total_kopecks),
                reply_markup=shop_or_menu_kb(),
            )
    except Exception:
        pass


# ── Order from miniapp ──
@router.message(F.web_app_data)
async def handle_webapp(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    user = message.from_user
    display_name = user.first_name or user.username or str(user.id)
    uname = f"@{user.username}" if user.username else "—"

    db_user = await get_or_create_user(user.id, user.username or "", user.first_name or "")

    try:
        order = json.loads(message.web_app_data.data)
    except Exception:
        await message.answer_photo(photo=BANNERS["sent_fail"], caption=sent_fail(), reply_markup=main_kb())
        return

    msg_type = order.get("type", "order")

    if msg_type == "cart_sync":
        cart_items = order.get("items", [])
        if db_user and db_user.get("id"):
            await save_user_cart(db_user["id"], cart_items)
        return

    items = order.get("items", [])
    total_rub = order.get("total", 0)
    contact = order.get("contact", {})
    payment_method = order.get("payment", "card")

    if not items:
        await message.answer("Empty order", reply_markup=main_kb())
        return

    total_kopecks = int(total_rub) * 100

    items_summary = ", ".join([it.get("name", "?") for it in items[:3]])
    if len(items) > 3:
        items_summary += f" and {len(items) - 3} more"
    description = f"SOULDAWN: {items_summary}"

    metadata = {
        "user_id": str(user.id),
        "username": uname,
        "display_name": display_name,
    }

    payment = await create_yookassa_payment(total_kopecks, description, metadata)

    if payment is None:
        logger.warning("YooKassa not configured, sending order directly to operator")
        await _send_order_direct(message, user, display_name, uname, items, total_kopecks, contact, payment_method)
        return

    pending_orders[payment["id"]] = {
        "user_id": user.id,
        "display_name": display_name,
        "username": uname,
        "items": items,
        "total_kopecks": total_kopecks,
        "total_rub": total_rub,
        "contact": contact,
        "payment_method": payment_method,
        "status": "pending",
        "created_at": time.time(),
    }

    if db_user and db_user.get("id"):
        await save_order(db_user["id"], items, total_kopecks, payment["id"], contact)

    await message.answer_photo(
        photo=BANNERS["pay_wait"],
        caption=pay_pending_text(total_kopecks, len(items)),
        reply_markup=pay_kb(payment["confirmation_url"], total_kopecks),
    )

    # Уведомить админа о новом заказе (ожидает оплаты)
    if SUPPORT_CHAT_ID:
        try:
            await bot.send_message(
                SUPPORT_CHAT_ID,
                f"SOULDAWN · New order (pending payment)\n\n"
                f"Buyer: {display_name} · ID: {user.id}\n"
                f"Username: {uname}\n"
                f"Items: {len(items)} · Total: {_fmt_price(total_kopecks)}\n"
                f"Method: {payment_method}\n"
                f"Waiting for YooKassa payment",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="REPLY", url=f"tg://user?id={user.id}")
                ]]),
            )
            logger.info(f"Admin notified: new order from {display_name} (pending)")
        except Exception as e:
            logger.error(f"Error notifying admin: {e}")


async def _send_order_direct(
    message: Message, user, display_name: str, uname: str,
    items: list, total_kopecks: int, contact: dict,
    payment_method: str,
) -> None:
    lines = []
    for i, it in enumerate(items, 1):
        name = it.get("name", it.get("id", "?"))
        qty = it.get("qty", 1)
        price = it.get("price", 0)
        lines.append(f"{i}. {name} x{qty} - {_fmt_price(price)}")

    order_text = (
        f"SOULDAWN · New order (NO PAYMENT - YooKassa unavailable)\n\n"
        f"Buyer: {display_name} · ID: {user.id}\n"
        f"Username: {uname}\n\n"
        f"Items:\n" + "\n".join(lines) + f"\n\n"
        f"Total: {_fmt_price(total_kopecks)}\n"
        f"Method: {payment_method}"
    )

    if SUPPORT_CHAT_ID:
        try:
            await message.bot.send_message(
                SUPPORT_CHAT_ID,
                order_text,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="REPLY", url=f"tg://user?id={user.id}")
                ]]),
            )
            await message.answer_photo(
                photo=BANNERS["sent_ok"],
                caption="Order placed (payment pending). Operator will contact you soon.",
                reply_markup=shop_or_menu_kb(),
            )
        except Exception as e:
            logger.error(f"Order error: {e}")
            await message.answer_photo(photo=BANNERS["sent_fail"], caption=sent_fail(), reply_markup=main_kb())
    else:
        await message.answer_photo(photo=BANNERS["offline"], caption=offline(), reply_markup=main_kb())


# ── Catch-all (must be last router) ──
@router.message()
async def handle_any(message: Message, state: FSMContext):
    if await state.get_state():
        return
    await message.answer_photo(photo=BANNERS["welcome"], caption=welcome(), reply_markup=main_kb())
