/**
 * SOULDAWN — отправка email через Resend (HTTP API).
 *
 * Без RESEND_API_KEY ничего не ломается: sendEmail вернёт { ok:false, error },
 * вызывающий код покажет понятное сообщение (паттерн как с R2_*).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "SOULDAWN <onboarding@resend.dev>";

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "Email-рассылка не настроена (RESEND_API_KEY)" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend error:", res.status, text);
      return { ok: false, error: "Не удалось отправить письмо" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { ok: false, error: "Не удалось отправить письмо" };
  }
}

/** HTML письма подтверждения email. */
export function verificationEmailHtml(verifyUrl: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#fff;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;">
      <h1 style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">SOULDAWN</h1>
      <p style="font-size:15px;line-height:1.6;color:#cfcfcf;margin:0 0 24px;">
        Подтверди свою почту, чтобы привязать email к аккаунту и получать новости о дропах и акциях.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#fff;color:#0a0a0a;font-weight:700;text-decoration:none;padding:14px 28px;text-transform:uppercase;font-size:13px;letter-spacing:1px;">Подтвердить email</a>
      <p style="font-size:12px;color:#777;margin:24px 0 0;">Если кнопка не работает, открой ссылку:<br/><span style="color:#aaa;word-break:break-all;">${verifyUrl}</span></p>
      <p style="font-size:12px;color:#555;margin:16px 0 0;">Если ты не запрашивал это письмо — просто проигнорируй его.</p>
    </div>
  </div>`;
}
