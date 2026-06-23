import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { r2Configured, uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Проверяет magic bytes распространённых форматов изображений. */
function isValidImageSignature(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;
  // GIF: 'GIF8'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WEBP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  // AVIF: 'ftyp' в байтах 4..8 + brand avif/avis
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis" || brand === "mif1" || brand === "msf1") return true;
  }
  return false;
}

// POST multipart/form-data с полем file -> заливает в R2, возвращает { url }.
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  if (!r2Configured()) {
    return NextResponse.json(
      {
        error:
          "Загрузка файлов не настроена (нет R2_* env). Вставьте URL картинки вручную.",
      },
      { status: 501 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Неподдерживаемый тип файла" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Файл больше 8 МБ" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Проверка реальной сигнатуры (magic bytes): client MIME подделывается.
  if (!isValidImageSignature(buffer)) {
    return NextResponse.json({ error: "Файл не является корректным изображением" }, { status: 400 });
  }

  try {
    const url = await uploadToR2(key, buffer, file.type);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }
}
