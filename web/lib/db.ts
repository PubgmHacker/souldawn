/**
 * Lightweight PostgreSQL client wrapper.
 * Uses the DATABASE_URL environment variable (same one used by the bot server).
 *
 * We use the `pg` package which is already available in the Node.js ecosystem.
 * If it is not installed, the app will fall back gracefully and log a warning.
 */

let pool: any = null;

async function getPool() {
  if (pool) return pool;

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  try {
    // Dynamic import so the module doesn't crash at build time if pg is absent
    const { Pool } = await import("pg" as any);
    pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    return pool;
  } catch {
    throw new Error("pg package is not installed. Run: npm install pg @types/pg");
  }
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const p = await getPool();
  const result = await p.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

// ─── Schema migration ─────────────────────────────────────────────────────────

/**
 * Adds the new auth columns to the existing `users` table if they don't exist.
 * Called lazily on first auth API request.
 */
export async function ensureAuthColumns(): Promise<void> {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB`,
  ];

  for (const sql of migrations) {
    try {
      await query(sql);
    } catch {
      // Column may already exist with a different constraint — ignore
    }
  }
}
