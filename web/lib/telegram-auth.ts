/**
 * SOULDAWN — верификация Telegram-авторизации (единый модуль).
 *
 * Два потока, оба по официальной спецификации Telegram:
 *  1. Login Widget (обычный сайт): secret = SHA256(bot_token),
 *     data_check_string — отсортированные пары key=value через \n.
 *  2. Mini App initData: secret = HMAC_SHA256("WebAppData", bot_token),
 *     далее HMAC_SHA256(secret, data_check_string).
 *
 * Сравнение хешей — constant-time (timingSafeEqual).
 */
import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_bot?: boolean;
}

interface VerifyResult {
  valid: boolean;
  user?: TelegramUser;
  authDate?: number;
  error?: string;
}

// Максимальный возраст auth_date (секунды). Подпись старше — отклоняем.
// 24 часа: миниапп может быть открыт долго; initData перевыпускается Telegram
// при каждом новом открытии, но 1 часа не хватало — сессия отваливалась.
const MAX_AUTH_AGE_SEC = 60 * 60 * 24; // 24 часа

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function isFresh(authDate?: number): boolean {
  if (!authDate) return false;
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  return ageSec >= 0 && ageSec <= MAX_AUTH_AGE_SEC;
}

/**
 * Login Widget: данные приходят объектом { id, first_name, ..., auth_date, hash }.
 */
export function verifyLoginWidget(
  data: Record<string, unknown>,
  botToken: string
): VerifyResult {
  if (!botToken) return { valid: false, error: "Bot token not configured" };

  const { hash, ...fields } = data as Record<string, string> & { hash?: string };
  if (!hash) return { valid: false, error: "No hash provided" };

  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqualHex(calculatedHash, hash)) {
    return { valid: false, error: "Invalid signature" };
  }

  const authDate = data.auth_date ? parseInt(String(data.auth_date), 10) : undefined;
  if (!isFresh(authDate)) return { valid: false, error: "Auth data expired" };

  const user: TelegramUser = {
    id: parseInt(String(data.id), 10),
    first_name: data.first_name ? String(data.first_name) : undefined,
    last_name: data.last_name ? String(data.last_name) : undefined,
    username: data.username ? String(data.username) : undefined,
    photo_url: data.photo_url ? String(data.photo_url) : undefined,
  };
  if (!user.id) return { valid: false, error: "No user id" };

  return { valid: true, user, authDate };
}

/**
 * Mini App: initData — сырая query-строка из Telegram.WebApp.initData.
 */
export function verifyMiniAppInitData(
  initData: string,
  botToken: string
): VerifyResult {
  if (!botToken) return { valid: false, error: "Bot token not configured" };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false, error: "No hash provided" };
    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (!safeEqualHex(calculatedHash, hash)) {
      return { valid: false, error: "Invalid signature" };
    }

    const authDate = params.get("auth_date")
      ? parseInt(params.get("auth_date") as string, 10)
      : undefined;
    if (!isFresh(authDate)) return { valid: false, error: "Auth data expired" };

    const userStr = params.get("user");
    if (!userStr) return { valid: false, error: "No user data" };
    const user = JSON.parse(userStr) as TelegramUser;
    if (!user.id) return { valid: false, error: "No user id" };

    return { valid: true, user, authDate };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Verification failed" };
  }
}
