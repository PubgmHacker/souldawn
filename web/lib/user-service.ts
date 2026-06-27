/**
 * SOULDAWN — единый сервис пользователей (Prisma).
 * Используется всеми auth-эндпоинтами для upsert по telegram_id
 * и назначения роли по списку ADMIN_IDS (серверная истина).
 */
import { prisma } from "@/lib/prisma";
import type { TelegramUser } from "@/lib/telegram-auth";

export function getAdminIds(): bigint[] {
  return (process.env.ADMIN_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x))
    .map((x) => BigInt(x));
}

export function roleForTelegramId(telegramId: bigint): "user" | "admin" {
  return getAdminIds().includes(telegramId) ? "admin" : "user";
}

export interface PublicUser {
  id: string;
  telegram_id: number;
  username: string;
  name: string;
  photo_url: string | null;
  email: string | null;
  role: string;
  is_admin: boolean;
  notify_new_drops: boolean;
  notify_promos: boolean;
  notify_email: boolean;
  email_verified: boolean;
  created_at: string | null;
  last_login: string | null;
}

function toPublicUser(u: any): PublicUser {
  const profile = (u.profileData as Record<string, any>) || {};
  return {
    id: String(u.id),
    telegram_id: Number(u.telegramId),
    username: u.username || "",
    name: u.fullName || "",
    photo_url: profile.photo_url || null,
    email: u.email || null,
    role: u.role || "user",
    is_admin: u.role === "admin" || u.role === "owner" || !!u.isAdmin,
    notify_new_drops: u.notifyNewDrops,
    notify_promos: u.notifyPromos,
    notify_email: !!u.notifyEmail,
    email_verified: !!u.emailVerified,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    last_login: u.lastLogin ? new Date(u.lastLogin).toISOString() : null,
  };
}

/**
 * Upsert по telegram_id. Роль повышается до admin если id в ADMIN_IDS
 * (но не понижает owner). Аватарка хранится в profile_data.
 */
export async function upsertTelegramUser(tg: TelegramUser): Promise<PublicUser> {
  const telegramId = BigInt(tg.id);
  const fullName = [tg.first_name, tg.last_name].filter(Boolean).join(" ").trim();
  const username = tg.username || "";
  const isAdmin = getAdminIds().includes(telegramId);

  const existing = await prisma.user.findUnique({ where: { telegramId } });

  const profileData: Record<string, any> = {
    ...((existing?.profileData as Record<string, any>) || {}),
  };
  if (tg.photo_url) profileData.photo_url = tg.photo_url;

  // Роль: owner не трогаем; иначе admin/user по ADMIN_IDS.
  let role = existing?.role || "user";
  if (role !== "owner") role = isAdmin ? "admin" : "user";

  const user = await prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username,
      fullName,
      role,
      isAdmin,
      profileData,
      lastLogin: new Date(),
      lastSeen: new Date(),
    },
    update: {
      username,
      fullName,
      role,
      isAdmin,
      profileData,
      lastLogin: new Date(),
      lastSeen: new Date(),
    },
  });

  return toPublicUser(user);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toPublicUser(user) : null;
}

// ─── Multi-provider: связывание/создание юзера по identity ────────────────
export type AuthProvider = "telegram" | "email" | "apple" | "vk";

export interface IdentityProfile {
  fullName?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
  telegramId?: bigint; // только для provider=telegram
  passwordHash?: string; // только для provider=email при регистрации
}

/**
 * Находит юзера по (provider, providerUid). Если нет — создаёт нового.
 * Для telegram также синхронизирует users.telegram_id (мост с ботом).
 * Роль назначается по ADMIN_IDS только для telegram-входа.
 */
export async function linkOrCreateUser(
  provider: AuthProvider,
  providerUid: string,
  profile: IdentityProfile
): Promise<PublicUser> {
  const identity = await prisma.identity.findUnique({
    where: { provider_providerUid: { provider, providerUid } },
  });

  if (identity) {
    const current = await prisma.user.findUnique({ where: { id: identity.userId } });
    const updateData: Record<string, any> = { lastLogin: new Date(), lastSeen: new Date() };
    if (profile.fullName) updateData.fullName = profile.fullName;
    if (profile.username) updateData.username = profile.username;

    // telegram: синхронизируем users.telegram_id и роль (owner не понижаем).
    if (provider === "telegram" && profile.telegramId !== undefined) {
      updateData.telegramId = profile.telegramId;
      if (current && current.role !== "owner") {
        const isAdmin = getAdminIds().includes(profile.telegramId);
        updateData.role = isAdmin ? "admin" : "user";
        updateData.isAdmin = isAdmin;
      }
    }

    if (profile.photoUrl) {
      const pd = ((current?.profileData as Record<string, any>) || {});
      pd.photo_url = profile.photoUrl;
      updateData.profileData = pd;
    }

    const user = await prisma.user.update({ where: { id: identity.userId }, data: updateData });
    return toPublicUser(user);
  }

  // Новый юзер + identity в одной транзакции.
  const isTgAdmin =
    provider === "telegram" && profile.telegramId !== undefined
      ? getAdminIds().includes(profile.telegramId)
      : false;

  const profileData: Record<string, any> = {};
  if (profile.photoUrl) profileData.photo_url = profile.photoUrl;

  const user = await prisma.user.create({
    data: {
      telegramId: provider === "telegram" ? profile.telegramId ?? null : null,
      email: provider === "email" ? profile.email?.toLowerCase() ?? null : profile.email?.toLowerCase() ?? null,
      username: profile.username || "",
      fullName: profile.fullName || "",
      role: isTgAdmin ? "admin" : "user",
      isAdmin: isTgAdmin,
      profileData,
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

/** Привязать новый способ входа к уже авторизованному юзеру. */
export async function linkIdentity(
  userId: string,
  provider: AuthProvider,
  providerUid: string,
  passwordHash?: string
): Promise<void> {
  await prisma.identity.upsert({
    where: { provider_providerUid: { provider, providerUid } },
    create: { userId, provider, providerUid, passwordHash: passwordHash ?? null },
    update: {},
  });
}

/** Найти email-identity для проверки пароля. */
export async function findEmailIdentity(email: string) {
  const identity = await prisma.identity.findUnique({
    where: { provider_providerUid: { provider: "email", providerUid: email.toLowerCase() } },
    include: { user: true },
  });
  return identity;
}

export interface ProfileUpdate {
  fullName?: string;
  email?: string | null;
  notifyNewDrops?: boolean;
  notifyPromos?: boolean;
  notifyEmail?: boolean;
}

/** Помечает email пользователя подтверждённым. Вызывается из verify-роута. */
export async function setEmailVerified(userId: string, email: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { email: email.toLowerCase(), emailVerified: true },
  });
}

/**
 * Обновление собственного профиля пользователем (имя, email, тоглы уведомлений).
 * Роль/админ-флаги сюда НЕ попадают — их нельзя менять через self-service.
 */
export async function updateUserProfile(
  userId: string,
  patch: ProfileUpdate
): Promise<PublicUser> {
  const data: Record<string, any> = {};
  if (patch.fullName !== undefined) data.fullName = patch.fullName.trim();
  if (patch.email !== undefined) {
    data.email = patch.email ? patch.email.trim().toLowerCase() : null;
  }
  if (patch.notifyNewDrops !== undefined) data.notifyNewDrops = patch.notifyNewDrops;
  if (patch.notifyPromos !== undefined) data.notifyPromos = patch.notifyPromos;
  if (patch.notifyEmail !== undefined) data.notifyEmail = patch.notifyEmail;

  const user = await prisma.user.update({ where: { id: userId }, data });
  return toPublicUser(user);
}

export async function getOrdersForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return orders.map((o) => ({
    id: String(o.id),
    items: o.items,
    total: o.total,
    status: o.status,
    created_at: o.createdAt ? new Date(o.createdAt).toISOString() : null,
  }));
}
