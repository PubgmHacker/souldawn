"""SOULDAWN — Standalone DB connectivity test. Run BEFORE bot.py to verify DB is alive."""
import os
import sys
import asyncio
import traceback

from sqlalchemy import text

async def main():
    print("=" * 60, flush=True)
    print(">>> SOULDAWN DB CHECK — STARTED", flush=True)
    print(f">>> Python: {sys.version}", flush=True)
    print(f">>> CWD: {os.getcwd()}", flush=True)
    print("=" * 60, flush=True)

    # 1. Check env var
    url = os.getenv("DATABASE_URL", "")
    if not url:
        print("!!! FATAL: DATABASE_URL is NOT SET in environment !!!", flush=True)
        print("!!! Fix: Add DATABASE_URL in Railway Variables section !!!", flush=True)
        sys.exit(1)

    masked = url[:30] + "***" + url[-10:] if len(url) > 40 else url
    print(f"DATABASE_URL present: YES (len={len(url)})", flush=True)
    print(f"DATABASE_URL preview: {masked}", flush=True)

    # 2. Convert postgres:// → postgresql+asyncpg:// if needed
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        print(f"Converted postgres:// → postgresql+asyncpg://", flush=True)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        print(f"Converted postgresql:// → postgresql+asyncpg://", flush=True)
    else:
        print(f"URL scheme looks correct: {url.split('://')[0]}://", flush=True)

    # 3. Create engine and test connection
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

        print("Creating SQLAlchemy async engine...", flush=True)
        engine = create_async_engine(
            url,
            pool_size=3,
            max_overflow=5,
            pool_pre_ping=True,
        )
        print("Engine created OK", flush=True)

        print("Testing raw connection (SELECT 1)...", flush=True)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            print(f"SELECT 1 → {row}  ✅ SUCCESS", flush=True)

        # 4. Check PostgreSQL version
        print("Checking PostgreSQL version...", flush=True)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            row = result.fetchone()
            print(f"PostgreSQL version: {row[0]}", flush=True)

        # 5. List existing tables
        print("Listing existing tables...", flush=True)
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY table_name"
            ))
            tables = [r[0] for r in result.fetchall()]
        print(f"Existing tables: {tables}", flush=True)

        # 6. Create all tables
        print("Creating tables if not exist...", flush=True)
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

        created = []
        failed = []
        for name, sql in TABLES:
            try:
                async with engine.begin() as conn:
                    await conn.execute(text(sql))
                created.append(name)
                print(f"  ✅ {name}", flush=True)
            except Exception as e:
                failed.append(name)
                print(f"  ❌ {name}: {type(e).__name__}: {e}", flush=True)
                traceback.print_exc()

        print(f"Tables created: {len(created)}, failed: {len(failed)}", flush=True)

        # 7. Final verify
        async with engine.connect() as conn:
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' ORDER BY table_name"
            ))
            final_tables = [r[0] for r in result.fetchall()]
        print(f"Final table list: {final_tables}", flush=True)

        await engine.dispose()

        print("=" * 60, flush=True)
        print(">>> DB CHECK COMPLETE — ALL OK ✅", flush=True)
        print("=" * 60, flush=True)

    except Exception as e:
        print("=" * 60, flush=True)
        print(f"!!! DB CHECK FAILED: {type(e).__name__}: {e} !!!", flush=True)
        traceback.print_exc()
        print("=" * 60, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
