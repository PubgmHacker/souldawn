/**
 * GET /api/reviews
 * Загружает отзывы из публичной Telegram-группы.
 * Поддерживает фото и видео через Bot API getFile.
 * Кэш в БД (model Review) и revalidate 120с.
 *
 * Env: BOT_TOKEN, REVIEW_CHANNEL_USERNAME (@username без @)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 120;

export interface TelegramReview {
  id: string;
  tgMessageId: number;
  text: string;
  author: string;
  username?: string;
  date: number;
  rating?: number;
  mediaType: "none" | "photo" | "video";
  mediaUrl?: string;
  mediaThumb?: string;
}

function extractRating(text: string): number | undefined {
  const stars = (text.match(/★/g) || []).length;
  if (stars >= 1 && stars <= 5) return stars;
  const m = text.match(/(\d)\/5/);
  if (m) return parseInt(m[1]);
  return undefined;
}

async function getFileUrl(token: string, fileId: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const d = await r.json();
    if (d.ok && d.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${d.result.file_path}`;
    }
  } catch {}
  return null;
}

export async function GET() {
  const token   = process.env.BOT_TOKEN || "";
  const channel = (process.env.REVIEW_CHANNEL_USERNAME || "").replace("@", "");
  const channelUrl = channel ? `https://t.me/${channel}` : "";

  // 1. Попытка взять из кэша БД
  try {
    const cached = await (prisma as any).review.findMany({
      orderBy: { tgDate: "desc" },
      take: 20,
    });
    if (cached.length > 0) {
      return NextResponse.json({
        reviews: cached.map((r: any) => ({
          id: r.id,
          tgMessageId: r.tgMessageId,
          text: r.text,
          author: r.author,
          username: r.username,
          date: r.tgDate,
          rating: r.rating,
          mediaType: r.mediaType,
          mediaUrl: r.mediaUrl,
          mediaThumb: r.mediaThumb,
        })),
        channel: `@${channel}`,
        channel_url: channelUrl,
      });
    }
  } catch {}

  // 2. Загрузка из Telegram Bot API
  if (!token || !channel) {
    return NextResponse.json({ reviews: [], channel_url: channelUrl });
  }

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates?limit=100&allowed_updates=[%22channel_post%22]`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ reviews: [], channel_url: channelUrl });
    }

    const posts = (data.result || [])
      .filter((u: any) => u.channel_post?.chat?.username === channel)
      .map((u: any) => u.channel_post)
      .filter((msg: any) => (msg.text || msg.caption || "").length > 5 || msg.photo || msg.video);

    const reviews: TelegramReview[] = [];

    for (const msg of posts.slice(-20)) {
      const text   = msg.text || msg.caption || "";
      const from   = msg.forward_from || {};
      const author = from.first_name || from.username || "Покупатель";

      let mediaType: "none" | "photo" | "video" = "none";
      let mediaUrl: string | undefined;
      let mediaThumb: string | undefined;

      if (msg.photo?.length) {
        mediaType = "photo";
        // Берём наибольшее фото
        const best  = msg.photo[msg.photo.length - 1];
        const thumb = msg.photo[Math.min(1, msg.photo.length - 1)];
        mediaUrl   = await getFileUrl(token, best.file_id) || undefined;
        mediaThumb = await getFileUrl(token, thumb.file_id) || undefined;
      } else if (msg.video) {
        mediaType  = "video";
        mediaUrl   = await getFileUrl(token, msg.video.file_id) || undefined;
        if (msg.video.thumbnail || msg.video.thumb) {
          mediaThumb = await getFileUrl(token, (msg.video.thumbnail || msg.video.thumb).file_id) || undefined;
        }
      }

      const review: TelegramReview = {
        id: `tg_${msg.message_id}`,
        tgMessageId: msg.message_id,
        text,
        author,
        username: from.username,
        date: msg.date,
        rating: extractRating(text),
        mediaType,
        mediaUrl,
        mediaThumb,
      };
      reviews.push(review);

      // Кэшируем в БД
      try {
        await (prisma as any).review.upsert({
          where: { tgMessageId: msg.message_id },
          create: {
            tgMessageId: msg.message_id,
            author,
            username: from.username || null,
            text,
            rating: extractRating(text) || null,
            mediaType,
            mediaUrl: mediaUrl || null,
            mediaThumb: mediaThumb || null,
            tgDate: msg.date,
          },
          update: { text, mediaUrl: mediaUrl || null, mediaThumb: mediaThumb || null },
        });
      } catch {}
    }

    return NextResponse.json({
      reviews: reviews.reverse(),
      channel: `@${channel}`,
      channel_url: channelUrl,
    });
  } catch (e) {
    return NextResponse.json({ reviews: [], error: String(e), channel_url: channelUrl });
  }
}
