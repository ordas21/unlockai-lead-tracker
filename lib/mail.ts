import Mailgun from "mailgun.js";
import FormData from "form-data";

function getClient() {
  const key = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!key || !domain) {
    throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN env vars are required");
  }

  const mailgun = new Mailgun(FormData);
  return {
    mg: mailgun.client({
      username: "api",
      key,
      url: process.env.MAILGUN_BASE_URL || "https://api.mailgun.net",
    }),
    domain,
  };
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<void> {
  const { mg, domain } = getClient();

  await mg.messages.create(domain, {
    to: [to],
    from: `UnlockAI Lead Tracker <noreply@${domain}>`,
    subject: "Verify your email — UnlockAI Lead Tracker",
    html: `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 28px;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">UnlockAI Lead Tracker</h1>
  </div>
  <div style="padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="color:#333;font-size:16px;margin:0 0 8px">Hey ${name},</p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px">
      Click the button below to verify your email and activate your account.
    </p>
    <a href="${verifyUrl}" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">
      Verify Email
    </a>
    <p style="color:#999;font-size:12px;margin:24px 0 0;line-height:1.5">
      Or copy this link:<br/>
      <a href="${verifyUrl}" style="color:#3b82f6;word-break:break-all">${verifyUrl}</a>
    </p>
    <p style="color:#bbb;font-size:11px;margin:20px 0 0">
      If you didn't create this account, you can safely ignore this email.
    </p>
  </div>
</div>`,
    text: `Hey ${name},\n\nVerify your email by visiting: ${verifyUrl}\n\nIf you didn't create this account, ignore this email.`,
  });
}
