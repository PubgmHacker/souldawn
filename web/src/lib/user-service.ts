import { db } from "@/lib/db";

export interface PublicUser {
  id: string;
  telegram_id: number | null;
  username: string;
  name: string;
  photo_url: string | null;
  email: string | null;
  role: string;
  is_admin: boolean;
  is_active: boolean;
  notify_new_drops: boolean;
  notify_promos: boolean;
  email_verified: boolean;
  created_at: string | null;
  last_login: string | null;
}

function parseProfileData(profileDataStr: string): Record<string, any> {
  try { return JSON.parse(profileDataStr || "{}"); } catch { return {}; }
}

function toPublicUser(u: any): PublicUser {
  const profile = parseProfileData(u.profileData);
  return {
    id: u.id,
    telegram_id: u.telegramId != null ? Number(u.telegramId) : null,
    username: u.username || "",
    name: u.fullName || "",
    photo_url: profile.photo_url || null,
    email: u.email || null,
    role: u.role || "user",
    is_admin: u.role === "admin" || u.role === "owner" || !!u.isAdmin,
    is_active: u.isActive !== false,
    notify_new_drops: !!u.notifyNewDrops,
    notify_promos: !!u.notifyPromos,
    email_verified: false,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    last_login: u.lastLogin ? new Date(u.lastLogin).toISOString() : null,
  };
}

export type AuthProvider = "telegram" | "email";

export interface IdentityProfile {
  fullName?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  telegramId?: number | bigint;
  passwordHash?: string;
}

export async function linkOrCreateUser(
  provider: AuthProvider,
  providerUid: string,
  profile: IdentityProfile
): Promise<PublicUser> {
  const identity = await db.identity.findUnique({
    where: { provider_providerUid: { provider, providerUid } },
  });

  if (identity) {
    const current = await db.user.findUnique({ where: { id: identity.userId } });
    const updateData: Record<string, any> = { lastLogin: new Date() };
    if (profile.fullName) updateData.fullName = profile.fullName;
    if (profile.username) updateData.username = profile.username;
    if (provider === "telegram" && profile.telegramId !== undefined) {
      updateData.telegramId = profile.telegramId;
    }
    if (profile.photoUrl) {
      const pd = parseProfileData(current?.profileData || "{}");
      pd.photo_url = profile.photoUrl;
      updateData.profileData = JSON.stringify(pd);
    }
    const user = await db.user.update({ where: { id: identity.userId }, data: updateData });
    return toPublicUser(user);
  }

  // No identity found — check if a user already exists (e.g. created via old upsertTelegramUser)
  // so we don't hit UniqueConstraintViolationError on telegramId.
  const tgId = provider === "telegram" && profile.telegramId !== undefined
    ? typeof profile.telegramId === "number" ? BigInt(profile.telegramId) : profile.telegramId
    : null;

  const existingByTelegram = tgId != null
    ? await db.user.findUnique({ where: { telegramId: tgId } })
    : null;

  if (existingByTelegram) {
    // Link existing user to new identity and update profile
    const updateData: Record<string, any> = { lastLogin: new Date() };
    if (profile.fullName) updateData.fullName = profile.fullName;
    if (profile.username) updateData.username = profile.username;
    if (profile.photoUrl) {
      const pd = parseProfileData(existingByTelegram.profileData || "{}");
      pd.photo_url = profile.photoUrl;
      updateData.profileData = JSON.stringify(pd);
    }
    await db.user.update({ where: { id: existingByTelegram.id }, data: updateData });
    await db.identity.create({
      data: {
        userId: existingByTelegram.id,
        provider,
        providerUid,
        passwordHash: provider === "email" ? profile.passwordHash ?? null : null,
      },
    });
    const user = await db.user.findUnique({ where: { id: existingByTelegram.id } });
    return toPublicUser(user!);
  }

  const profileData: Record<string, any> = {};
  if (profile.photoUrl) profileData.photo_url = profile.photoUrl;

  const user = await db.user.create({
    data: {
      telegramId: provider === "telegram" ? tgId ?? null : null,
      email: provider === "email" ? profile.email?.toLowerCase() ?? null : null,
      username: profile.username || "",
      fullName: profile.fullName || "",
      profileData: JSON.stringify(profileData),
      lastLogin: new Date(),
      identities: {
        create: {
          provider,
          providerUid,
          passwordHash: provider === "email" ? profile.passwordHash ?? null : null,
        },
      },
    },
  });

  return toPublicUser(user);
}

export async function findEmailIdentity(email: string) {
  return db.identity.findUnique({
    where: { provider_providerUid: { provider: "email", providerUid: email.toLowerCase() } },
    include: { user: true },
  });
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await db.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

export async function getOrdersForUser(userId: string, userEmail?: string | null) {
  const orders = await db.order.findMany({
    where: {
      OR: [
        { userId },
        ...(userEmail ? [{ userEmail, userId: null as unknown as string }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return orders.map((o) => ({
    id: o.id,
    cipher: o.cipher,
    items: JSON.parse(o.items || "[]"),
    total: o.total,
    subtotal: o.subtotal,
    deliveryCost: o.deliveryCost,
    discountAmount: o.discountAmount,
    promoCode: o.promoCode || null,
    status: o.status,
    created_at: o.createdAt ? new Date(o.createdAt).toISOString() : null,
    tracking: o.trackingCode || null,
    itemNames: o.itemNames || "",
    itemsCount: o.itemsCount || 0,
    deliveryType: o.deliveryType || "",
    deliveryCity: o.deliveryCity || "",
    pvzAddress: o.pvzAddress || "",
    deliveryAddress: o.deliveryAddress || "",
  }));
}

export async function upsertTelegramUser(data: {
  id: number | bigint;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}): Promise<PublicUser> {
  const telegramId = typeof data.id === "number" ? BigInt(data.id) : data.id;
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();

  const existing = await db.user.findUnique({ where: { telegramId } });
  const profileData: Record<string, any> = existing ? parseProfileData(existing.profileData || "{}") : {};
  if (data.photo_url) profileData.photo_url = data.photo_url;

  const user = await db.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: data.username || "",
      fullName,
      profileData: JSON.stringify(profileData),
      lastLogin: new Date(),
    },
    update: {
      username: data.username || "",
      fullName,
      profileData: JSON.stringify(profileData),
      lastLogin: new Date(),
    },
  });

  return toPublicUser(user);
}