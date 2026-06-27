/**
 * SOULDAWN — расчёт стоимости доставки СДЭК.
 *
 * Работает в двух режимах:
 *  1. Реальный CDEK API — если заданы CDEK_ACCOUNT и CDEK_PASSWORD
 *     (OAuth client_credentials -> POST /calculator/tariff).
 *  2. Fallback — если ключи не заданы: примерная ставка по региону
 *     (чтобы сайт работал без настроенного СДЭК).
 *
 * Среда: CDEK_API_URL (по умолчанию боевой https://api.cdek.ru/v2;
 * тестовый — https://api.edu.cdek.ru/v2).
 */
const CDEK_API_URL = process.env.CDEK_API_URL || "https://api.cdek.ru/v2";
const CDEK_ACCOUNT = process.env.CDEK_ACCOUNT || "";
const CDEK_PASSWORD = process.env.CDEK_PASSWORD || "";
// Код города-отправителя СДЭК (по умолчанию 44 — Москва).
const CDEK_FROM_CITY_CODE = Number(process.env.CDEK_FROM_CITY_CODE || "44");
// Тариф СДЭК (по умолчанию 136 — посылка склад-склад).
const CDEK_TARIFF_CODE = Number(process.env.CDEK_TARIFF_CODE || "136");

export interface DeliveryQuote {
  cost_kopecks: number;
  min_days: number | null;
  max_days: number | null;
  source: "cdek" | "fallback";
}

export interface DeliveryParams {
  cityCode?: number; // код города СДЭК (если известен)
  postalCode?: string; // почтовый индекс получателя
  region?: string; // название региона/города (для fallback)
  totalQty: number; // суммарное кол-во единиц (для веса)
}

// Вес одной единицы одежды (граммы) для расчёта.
const UNIT_WEIGHT_G = 500;

async function getToken(): Promise<string | null> {
  if (!CDEK_ACCOUNT || !CDEK_PASSWORD) return null;
  try {
    const res = await fetch(`${CDEK_API_URL}/oauth/token?parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CDEK_ACCOUNT,
        client_secret: CDEK_PASSWORD,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

/** Примерная ставка по региону (fallback, копейки). */
function fallbackQuote(params: DeliveryParams): DeliveryQuote {
  const region = (params.region || "").toLowerCase();
  let base = 45000; // 450 ₽ — базовая ставка по РФ
  let minDays = 3;
  let maxDays = 7;

  if (/москв|moscow/.test(region)) {
    base = 30000;
    minDays = 1;
    maxDays = 2;
  } else if (/санкт|петербург|spb|piter/.test(region)) {
    base = 35000;
    minDays = 2;
    maxDays = 3;
  } else if (/камчат|сахалин|магадан|чукот|якут/.test(region)) {
    base = 80000;
    minDays = 7;
    maxDays = 14;
  }

  // Надбавка за каждую единицу сверх первой.
  const extra = Math.max(0, params.totalQty - 1) * 5000;
  return {
    cost_kopecks: base + extra,
    min_days: minDays,
    max_days: maxDays,
    source: "fallback",
  };
}

export async function calcDelivery(params: DeliveryParams): Promise<DeliveryQuote> {
  const token = await getToken();
  if (!token || (!params.cityCode && !params.postalCode)) {
    return fallbackQuote(params);
  }

  const weight = Math.max(1, params.totalQty) * UNIT_WEIGHT_G;
  const toLocation: Record<string, unknown> = {};
  if (params.cityCode) toLocation.code = params.cityCode;
  if (params.postalCode) toLocation.postal_code = params.postalCode;

  try {
    const res = await fetch(`${CDEK_API_URL}/calculator/tariff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tariff_code: CDEK_TARIFF_CODE,
        from_location: { code: CDEK_FROM_CITY_CODE },
        to_location: toLocation,
        packages: [{ weight, length: 30, width: 25, height: 10 }],
      }),
    });
    if (!res.ok) return fallbackQuote(params);
    const data = await res.json();
    if (data.total_sum === undefined || data.total_sum === null) {
      return fallbackQuote(params);
    }
    return {
      cost_kopecks: Math.round(Number(data.total_sum) * 100),
      min_days: data.period_min ?? null,
      max_days: data.period_max ?? null,
      source: "cdek",
    };
  } catch {
    return fallbackQuote(params);
  }
}
