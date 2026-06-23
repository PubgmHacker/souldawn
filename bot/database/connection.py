"""SOULDAWN — Database: SQLAlchemy async engine, session factory, CRUD."""
from __future__ import annotations

import json
import logging
import sys
import traceback
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

from sqlalchemy import select, func, update, delete, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from config import DATABASE_URL, ADMIN_IDS
from database.models import Base, User, Cart, Order, Broadcast, Expense, ActionLog

logger = logging.getLogger("SOULDAWN")

engine = None
async_session_factory = None


def _log(msg: str) -> None:
    """Print to stdout with flush — guaranteed visible in Railway logs."""
    print(msg, flush=True)


# ======================== INIT ========================

async def init_db() -> None:
    """Create engine, session factory, and ALL tables via direct SQL. Bulletproof."""
    global engine, async_session_factory

    _log("=" * 60)
    _log(">>> init_db() STARTED")
    _log(f">>> DATABASE_URL set: {bool(DATABASE_URL)}")

    if not DATABASE_URL:
        _log("!!! DATABASE_URL not set — DB DISABLED !!!")
        return

    _log(f">>> DATABASE_URL prefix: {DATABASE_URL[:40]}...")

    try:
        # -- Step 1: Create engine --
        _log("--> Step 1: Creating SQLAlchemy engine...")
        engine = create_async_engine(
            DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
        _log("--> Step 1 OK: engine created")

        # -- Step 2: Create session factory --
        _log("--> Step 2: Creating session factory...")
        async_session_factory = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False,
        )
        _log("--> Step 2 OK: session factory created")

        # -- Step 3: Test connection --
        _log("--> Step 3: Testing DB connection (SELECT 1)...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            _log(f"--> Step 3 OK: SELECT 1 returned {row}")

        # -- Step 4: Create tables one by one --
        _log("--> Step 4: Creating tables...")

        TABLES = [
            ("users", """
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    telegram_id BIGINT UNIQUE NOT NULL,
                    username VARCHAR(255) DEFAULT '',
                    full_name VARCHAR(255) DEFAULT '',
                    is_active BOOLEAN DEFAULT TRUE,
                    is_admin BOOLEAN DEFAULT FALSE,
                    notify_new_drops BOOLEAN DEFAULT TRUE,
                    notify_promos BOOLEAN DEFAULT TRUE,
                    last_seen TIMESTAMPTZ DEFAULT NOW(),
                    site_sessions INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("carts", """
                CREATE TABLE IF NOT EXISTS carts (
                    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    items JSONB DEFAULT '[]'::jsonb,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("orders", """
                CREATE TABLE IF NOT EXISTS orders (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id),
                    items JSONB NOT NULL,
                    total INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    yookassa_id VARCHAR(255),
                    contact JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("broadcasts", """
                CREATE TABLE IF NOT EXISTS broadcasts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    text TEXT NOT NULL,
                    target VARCHAR(50) DEFAULT 'all',
                    sent_at TIMESTAMPTZ,
                    sent_count INTEGER DEFAULT 0
                );
            """),
            ("expenses", """
                CREATE TABLE IF NOT EXISTS expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    category VARCHAR(100) DEFAULT 'other',
                    description VARCHAR(255) DEFAULT '',
                    amount INTEGER DEFAULT 0,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("miniapps", """
                CREATE TABLE IF NOT EXISTS miniapps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    url TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("action_logs", """
                CREATE TABLE IF NOT EXISTS action_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id BIGINT NOT NULL,
                    action_type TEXT NOT NULL,
                    target_id VARCHAR(255) DEFAULT '',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
            ("support_tickets", """
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id BIGINT NOT NULL,
                    admin_messages JSONB DEFAULT '[]'::jsonb,
                    original_text TEXT DEFAULT '',
                    status VARCHAR(50) DEFAULT 'open',
                    accepted_by BIGINT,
                    admin_name VARCHAR(255) DEFAULT '',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """),
        ]

        created_tables = []
        failed_tables = []

        for table_name, sql in TABLES:
            _log(f"--> Создаю таблицу {table_name}...")
            try:
                async with engine.begin() as conn:
                    await conn.execute(text(sql))
                created_tables.append(table_name)
                _log(f"--> {table_name}: OK")
            except Exception as e:
                failed_tables.append(table_name)
                _log(f"--> {table_name}: FAILED — {type(e).__name__}: {e}")
                traceback.print_exc()

        _log(f"--> Step 4 DONE: created={len(created_tables)}, failed={len(failed_tables)}")

        # -- Step 5: Verify tables exist in PostgreSQL --
        _log("--> Step 5: Verifying tables in PostgreSQL...")
        async with engine.connect() as conn:
            result = await conn.run_sync(
                lambda sync_conn: sync_conn.execute(
                    text("SELECT table_name FROM information_schema.tables "
                         "WHERE table_schema = 'public' ORDER BY table_name")
                ).fetchall()
            )
            existing_tables = [row[0] for row in result]

        _log(f"--> Step 5 OK: tables in DB = {existing_tables}")

        # -- Step 6: Final status --
        _log("=" * 60)
        _log(f">>> init_db() COMPLETE")
        _log(f">>> CREATED: {created_tables}")
        _log(f">>> FAILED:  {failed_tables}")
        _log(f">>> EXISTING IN DB: {existing_tables}")
        _log("=" * 60)

    except Exception as e:
        _log("=" * 60)
        _log("!!! КРИТИЧЕСКАЯ ОШИБКА ИНИЦИАЛИЗАЦИИ БД !!!")
        _log(f"!!! {type(e).__name__}: {e} !!!")
        traceback.print_exc()
        _log("=" * 60)
        engine = None
        async_session_factory = None


async def dispose_db() -> None:
    """Gracefully close the engine."""
    if engine:
        await engine.dispose()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get an async session (async generator dependency)."""
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        yield session


async def _session() -> AsyncSession:
    """Get a standalone async session."""
    if not async_session_factory:
        raise RuntimeError("DB not initialized")
    return async_session_factory()


# ======================== BOT REFERENCE ========================
_bot = None


def set_bot(bot):
    global _bot
    _bot = bot


# ======================== USER CRUD ========================

async def get_or_create_user(telegram_id: int, username: str = "", name: str = "") -> dict:
    if not async_session_factory:
        logger.warning("get_or_create_user: async_session_factory is None!")
        return {
            "id": None, "telegram_id": telegram_id,
            "username": username, "full_name": name,
            "is_admin": telegram_id in ADMIN_IDS,
        }

    async with async_session_factory() as session:
        # Explicit begin() ensures transaction is properly started
        async with session.begin():
            result = await session.execute(
                select(User).where(User.telegram_id == telegram_id)
            )
            user = result.scalar_one_or_none()

            is_new = False
            if not user:
                is_adm = telegram_id in ADMIN_IDS
                user = User(
                    telegram_id=telegram_id,
                    username=username or "",
                    full_name=name or "",
                    is_admin=is_adm,
                )
                session.add(user)
                await session.flush()
                await session.refresh(user)
                is_new = True
                logger.info(f"New user: @{username} ({telegram_id})")
            else:
                changed = False
                if user.username != (username or ""):
                    user.username = username or ""
                    changed = True
                if user.full_name != (name or ""):
                    user.full_name = name or ""
                    changed = True
                if changed:
                    await session.flush()

            user_dict = _user_to_dict(user)
        # session.begin() commits automatically on clean exit

    if is_new and _bot:
        from config import SUPPORT_CHAT_ID
        try:
            uname_str = f"@{username}" if username else "no username"
            await _bot.send_message(
                SUPPORT_CHAT_ID,
                f"New registration\n\nName: {name or '—'}\n"
                f"Username: {uname_str}\nTelegram ID: {telegram_id}\nSource: Telegram",
            )
        except Exception:
            pass
    return user_dict


def _user_to_dict(u: User) -> dict:
    return {
        "id": str(u.id) if u.id else None,
        "telegram_id": u.telegram_id,
        "username": u.username or "",
        "full_name": u.full_name or "",
        "name": u.full_name or "",
        "is_admin": u.is_admin or (u.telegram_id in ADMIN_IDS),
        "notify_new_drops": u.notify_new_drops,
        "notify_promos": u.notify_promos,
        "last_seen": u.last_seen.isoformat() if u.last_seen else None,
        "site_sessions": u.site_sessions or 0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ======================== CART CRUD ========================

async def get_user_cart(user_id) -> list:
    if not async_session_factory or not user_id:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Cart).where(Cart.user_id == user_id)
            )
            cart = result.scalar_one_or_none()
            items = cart.items if cart else []
    return items


async def save_user_cart(user_id, items: list) -> None:
    if not async_session_factory or not user_id:
        return
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Cart).where(Cart.user_id == user_id)
            )
            cart = result.scalar_one_or_none()
            if cart:
                cart.items = items
            else:
                cart = Cart(user_id=user_id, items=items)
                session.add(cart)
            await session.flush()


# ======================== ORDER CRUD ========================

async def save_order(user_id, items: list, total: int, yookassa_id: str, contact: dict) -> str:
    if not async_session_factory:
        return "local"
    async with async_session_factory() as session:
        async with session.begin():
            order = Order(
                user_id=user_id,
                items=items,
                total=total,
                yookassa_id=yookassa_id,
                contact=contact,
            )
            session.add(order)
            await session.flush()
            await session.refresh(order)
            order_id = str(order.id)
    return order_id


async def get_user_orders(user_id) -> list:
    if not async_session_factory or not user_id:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Order)
                .where(Order.user_id == user_id)
                .order_by(Order.created_at.desc())
                .limit(20)
            )
            orders = result.scalars().all()
            orders_list = [_order_to_dict(o) for o in orders]
    return orders_list


def _order_to_dict(o: Order) -> dict:
    return {
        "id": str(o.id),
        "user_id": str(o.user_id) if o.user_id else None,
        "items": o.items,
        "total": o.total,
        "status": o.status,
        "yookassa_id": o.yookassa_id,
        "contact": o.contact,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


# ======================== USER QUERIES ========================

async def get_all_users(notify_filter: str = "all") -> list:
    if not async_session_factory:
        logger.warning("get_all_users: async_session_factory is None!")
        return []
    async with async_session_factory() as session:
        async with session.begin():
            query = select(User.telegram_id).where(User.is_active == True)
            if notify_filter == "promos":
                query = query.where(User.notify_promos == True)
            elif notify_filter == "drops":
                query = query.where(User.notify_new_drops == True)
            result = await session.execute(query)
            users = [r[0] for r in result.all()]
    logger.info(f"get_all_users(filter={notify_filter}): found {len(users)} users")
    return users


async def deactivate_user(telegram_id: int) -> None:
    """Mark user as inactive (blocked bot)."""
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                update(User).where(User.telegram_id == telegram_id).values(is_active=False)
            )


async def update_user_heartbeat(telegram_id: int) -> None:
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                update(User)
                .where(User.telegram_id == telegram_id)
                .values(last_seen=datetime.now(timezone.utc))
            )


async def get_online_users() -> list:
    if not async_session_factory:
        return []
    threshold = datetime.now(timezone.utc) - timedelta(minutes=2)
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(User)
                .where(User.last_seen > threshold)
                .order_by(User.last_seen.desc())
            )
            users = result.scalars().all()
            online_list = [
                {
                    "telegram_id": u.telegram_id,
                    "username": u.username or "",
                    "name": u.full_name or "",
                    "last_seen": u.last_seen.isoformat() if u.last_seen else None,
                }
                for u in users
            ]
    return online_list


async def update_user_notifications(telegram_id: int, **kwargs) -> None:
    if not async_session_factory:
        return
    values = {}
    for k, v in kwargs.items():
        if k in ("notify_new_drops", "notify_promos"):
            values[k] = v
    if values:
        async with async_session_factory() as session:
            async with session.begin():
                await session.execute(
                    update(User).where(User.telegram_id == telegram_id).values(**values)
                )


# ======================== STATS ========================

async def get_stats(pending_count: int = 0) -> dict:
    return await get_full_stats(pending_count)


async def get_full_stats(pending_count: int = 0) -> dict:
    if not async_session_factory:
        return {
            "total_users": 0, "online_users": 0,
            "new_today": 0, "new_this_week": 0, "new_this_month": 0,
            "total_orders": 0, "orders_today": 0, "orders_this_week": 0,
            "orders_this_month": 0, "pending_orders": 0,
            "total_revenue": 0, "revenue_today": 0,
            "revenue_this_week": 0, "revenue_this_month": 0,
            "total_expenses": 0, "expenses_today": 0,
            "expenses_this_week": 0, "expenses_this_month": 0,
            "net_profit": 0, "net_profit_today": 0,
            "net_profit_this_week": 0, "net_profit_this_month": 0,
            "db_connected": False, "pending_payments": pending_count,
        }

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = today - timedelta(days=today.weekday())
    month = today.replace(day=1)
    online_threshold = now - timedelta(minutes=2)

    async with async_session_factory() as session:
        async with session.begin():
            total_users = await session.scalar(select(func.count(User.id))) or 0
            online_users = await session.scalar(
                select(func.count(User.id)).where(User.last_seen > online_threshold)
            ) or 0
            new_today = await session.scalar(
                select(func.count(User.id)).where(User.created_at > today)
            ) or 0
            new_week = await session.scalar(
                select(func.count(User.id)).where(User.created_at > week)
            ) or 0
            new_month = await session.scalar(
                select(func.count(User.id)).where(User.created_at > month)
            ) or 0
            total_orders = await session.scalar(select(func.count(Order.id))) or 0
            orders_today = await session.scalar(
                select(func.count(Order.id)).where(Order.created_at > today)
            ) or 0
            orders_week = await session.scalar(
                select(func.count(Order.id)).where(Order.created_at > week)
            ) or 0
            orders_month = await session.scalar(
                select(func.count(Order.id)).where(Order.created_at > month)
            ) or 0
            pending = await session.scalar(
                select(func.count(Order.id)).where(Order.status == "pending")
            ) or 0

            paid_filter = Order.status.in_(["paid", "shipped", "delivered"])
            rev_all = await session.scalar(
                select(func.coalesce(func.sum(Order.total), 0)).where(paid_filter)
            ) or 0
            rev_today = await session.scalar(
                select(func.coalesce(func.sum(Order.total), 0)).where(
                    paid_filter, Order.created_at > today
                )
            ) or 0
            rev_week = await session.scalar(
                select(func.coalesce(func.sum(Order.total), 0)).where(
                    paid_filter, Order.created_at > week
                )
            ) or 0
            rev_month = await session.scalar(
                select(func.coalesce(func.sum(Order.total), 0)).where(
                    paid_filter, Order.created_at > month
                )
            ) or 0

            exp_all = await session.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0))
            ) or 0
            exp_today = await session.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.created_at > today)
            ) or 0
            exp_week = await session.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.created_at > week)
            ) or 0
            exp_month = await session.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.created_at > month)
            ) or 0

    return {
        "total_users": total_users, "online_users": online_users,
        "new_today": new_today, "new_this_week": new_week, "new_this_month": new_month,
        "total_orders": total_orders, "orders_today": orders_today,
        "orders_this_week": orders_week, "orders_this_month": orders_month,
        "pending_orders": pending,
        "total_revenue": rev_all, "revenue_today": rev_today,
        "revenue_this_week": rev_week, "revenue_this_month": rev_month,
        "total_expenses": exp_all, "expenses_today": exp_today,
        "expenses_this_week": exp_week, "expenses_this_month": exp_month,
        "net_profit": rev_all - exp_all, "net_profit_today": rev_today - exp_today,
        "net_profit_this_week": rev_week - exp_week, "net_profit_this_month": rev_month - exp_month,
        "db_connected": True, "pending_payments": pending_count,
    }


# ======================== RECENT ORDERS ========================

async def get_recent_orders(limit: int = 20) -> list:
    if not async_session_factory:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Order).order_by(Order.created_at.desc()).limit(limit)
            )
            orders = result.scalars().all()
            orders_list = [_order_to_dict(o) for o in orders]
    return orders_list


# ======================== PAID ORDER POLLING ========================

async def get_paid_unnotified_orders(limit: int = 20) -> list:
    """Заказы со статусом 'paid' (подтверждены Next.js webhook'ом), ещё не обработаны ботом."""
    if not async_session_factory:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Order).where(Order.status == "paid").order_by(Order.created_at.asc()).limit(limit)
            )
            orders = result.scalars().all()
            orders_list = [_order_to_dict(o) for o in orders]
    return orders_list


async def mark_order_processing(order_id: str) -> bool:
    """Атомарно переводит заказ paid -> processing. True — если этот вызов выиграл гонку.
    Гарантирует, что уведомление об оплате отправляется ровно один раз."""
    if not async_session_factory:
        return False
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                update(Order)
                .where(Order.id == order_id, Order.status == "paid")
                .values(status="processing")
            )
            return result.rowcount > 0


# ======================== PRODUCTS (единый каталог с web) ========================

async def get_products_by_ids(ids: list[str]) -> dict[str, dict]:
    """Возвращает {id: {name, price_kopecks, stock, is_active}} для активных товаров.

    Источник истины — общая таблица products (та же, что у web/Prisma).
    Цены в копейках. Неизвестные/неактивные товары в результат не попадают.
    """
    if not async_session_factory or not ids:
        return {}
    # Уникальные непустые id.
    clean_ids = [str(i) for i in dict.fromkeys(ids) if str(i).strip()]
    if not clean_ids:
        return {}
    out: dict[str, dict] = {}
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "SELECT id::text AS id, name, price_kopecks, stock, is_active "
                    "FROM products WHERE id = ANY(:ids) AND is_active = TRUE"
                ),
                {"ids": clean_ids},
            )
            for row in result.mappings().all():
                out[row["id"]] = {
                    "name": row["name"],
                    "price_kopecks": int(row["price_kopecks"] or 0),
                    "stock": int(row["stock"] or 0),
                    "is_active": bool(row["is_active"]),
                }
    return out


# ======================== EXPENSES ========================

async def add_expense(category: str, description: str, amount: int) -> dict:
    if not async_session_factory:
        return {"error": "DB not connected"}
    async with async_session_factory() as session:
        async with session.begin():
            exp = Expense(category=category, description=description, amount=amount)
            session.add(exp)
            await session.flush()
            await session.refresh(exp)
            result = {
                "id": str(exp.id),
                "category": exp.category,
                "description": exp.description,
                "amount": exp.amount,
                "created_at": exp.created_at.isoformat() if exp.created_at else None,
            }
    return result


async def get_expenses(limit: int = 50) -> list:
    if not async_session_factory:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                select(Expense).order_by(Expense.created_at.desc()).limit(limit)
            )
            expenses = result.scalars().all()
            expenses_list = [
                {
                    "id": str(e.id),
                    "category": e.category,
                    "description": e.description,
                    "amount": e.amount,
                    "created_at": e.created_at.isoformat() if e.created_at else None,
                }
                for e in expenses
            ]
    return expenses_list


async def delete_expense(expense_id: str) -> bool:
    if not async_session_factory:
        return False
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                delete(Expense).where(Expense.id == expense_id)
            )
            deleted = result.rowcount > 0
    return deleted


# ======================== ACTION LOGS ========================

async def log_action(user_id: int, action_type: str, target_id: str = "") -> None:
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            log = ActionLog(user_id=user_id, action_type=action_type, target_id=target_id)
            session.add(log)


# ======================== SUPPORT TICKETS ========================

async def create_ticket(user_id: int, admin_messages: list, original_text: str = "") -> dict:
    """Save a support ticket. admin_messages = [{"admin_id": 123, "message_id": 456}]."""
    if not async_session_factory:
        logger.warning("create_ticket: async_session_factory is None!")
        return {}
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "INSERT INTO support_tickets (user_id, admin_messages, original_text) "
                    "VALUES (:uid, :amsg::jsonb, :otxt) RETURNING id"
                ),
                {"uid": user_id, "amsg": json.dumps(admin_messages), "otxt": original_text},
            )
            row = result.first()
            ticket_id = str(row[0]) if row else None
            ticket_dict = {"id": ticket_id, "user_id": user_id, "admin_messages": admin_messages}
    logger.info(f"Ticket created: user={user_id}, admins={len(admin_messages)}, id={ticket_id}")
    return ticket_dict


async def get_ticket(ticket_id: str) -> dict | None:
    """Get a ticket by ID."""
    if not async_session_factory:
        return None
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text("SELECT id, user_id, admin_messages, original_text, status, accepted_by, admin_name, created_at "
                     "FROM support_tickets WHERE id = :tid LIMIT 1"),
                {"tid": ticket_id},
            )
            row = result.mappings().first()
            ticket = None
            if row:
                ticket = {
                    "id": str(row["id"]),
                    "user_id": row["user_id"],
                    "admin_messages": row["admin_messages"] or [],
                    "original_text": row["original_text"] or "",
                    "status": row["status"],
                    "accepted_by": row["accepted_by"],
                    "admin_name": row["admin_name"] or "",
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
    return ticket


async def take_ticket(ticket_id: str, admin_id: int, admin_name: str) -> bool:
    """Attempt to accept a ticket. Returns True if successful, False if already taken."""
    if not async_session_factory:
        return False
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "UPDATE support_tickets SET accepted_by = :aid, admin_name = :aname, status = 'in_progress' "
                    "WHERE id = :tid AND (accepted_by IS NULL)"
                ),
                {"aid": admin_id, "aname": admin_name, "tid": ticket_id},
            )
            success = result.rowcount > 0
    return success


async def get_ticket_by_message_id(message_id: int) -> dict | None:
    """Find ticket by a message_id inside the admin_messages JSONB array."""
    if not async_session_factory:
        return None
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "SELECT id, user_id, admin_messages, original_text, status, accepted_by, admin_name, created_at "
                    "FROM support_tickets "
                    "WHERE admin_messages @> :msg_json::jsonb "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"msg_json": json.dumps([{"message_id": message_id}])},
            )
            row = result.mappings().first()
            ticket = None
            if row:
                ticket = {
                    "id": str(row["id"]),
                    "user_id": row["user_id"],
                    "admin_messages": row["admin_messages"] or [],
                    "original_text": row["original_text"] or "",
                    "status": row["status"],
                    "accepted_by": row["accepted_by"],
                    "admin_name": row["admin_name"] or "",
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
    return ticket


async def update_ticket_admin_messages(ticket_id: str, admin_messages: list) -> None:
    """Update admin_messages JSONB after sending messages to admins."""
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                text("UPDATE support_tickets SET admin_messages = :amsg::jsonb WHERE id = :tid"),
                {"amsg": json.dumps(admin_messages), "tid": ticket_id},
            )


async def close_ticket(ticket_id: str) -> None:
    """Mark a ticket as closed."""
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                text("UPDATE support_tickets SET status = 'closed' WHERE id = :tid"),
                {"tid": ticket_id},
            )


async def get_ticket_by_accepted_admin(admin_id: int) -> dict | None:
    """Find the most recent open/in_progress ticket accepted by this admin."""
    if not async_session_factory:
        return None
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "SELECT id, user_id, admin_messages, original_text, status, accepted_by, admin_name, created_at "
                    "FROM support_tickets "
                    "WHERE accepted_by = :aid AND status IN ('in_progress', 'open') "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"aid": admin_id},
            )
            row = result.mappings().first()
            ticket = None
            if row:
                ticket = {
                    "id": str(row["id"]),
                    "user_id": row["user_id"],
                    "admin_messages": row["admin_messages"] or [],
                    "original_text": row["original_text"] or "",
                    "status": row["status"],
                    "accepted_by": row["accepted_by"],
                    "admin_name": row["admin_name"] or "",
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
    return ticket


async def get_open_tickets() -> list:
    """Get all open support tickets."""
    if not async_session_factory:
        return []
    async with async_session_factory() as session:
        async with session.begin():
            result = await session.execute(
                text(
                    "SELECT id, user_id, admin_messages, original_text, status, accepted_by, admin_name, created_at "
                    "FROM support_tickets "
                    "WHERE status IN ('open', 'in_progress') "
                    "ORDER BY created_at DESC"
                )
            )
            rows = result.mappings().all()
            tickets = [
                {
                    "id": str(row["id"]),
                    "user_id": row["user_id"],
                    "admin_messages": row["admin_messages"] or [],
                    "original_text": row["original_text"] or "",
                    "status": row["status"],
                    "accepted_by": row["accepted_by"],
                    "admin_name": row["admin_name"] or "",
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                for row in rows
            ]
    return tickets


async def update_ticket_status(ticket_id: str, status: str, admin_name: str = "") -> None:
    """Update ticket status and admin_name."""
    if not async_session_factory:
        return
    async with async_session_factory() as session:
        async with session.begin():
            await session.execute(
                text("UPDATE support_tickets SET status = :s, admin_name = :an WHERE id = :tid"),
                {"s": status, "an": admin_name, "tid": ticket_id},
            )
