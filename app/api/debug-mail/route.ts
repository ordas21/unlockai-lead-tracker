import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const baseUrl = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net";

  // Test with raw fetch instead of mailgun.js
  try {
    const form = new FormData();
    form.append("from", `Test <noreply@${domain}>`);
    form.append("to", "sebastianordas21@gmail.com");
    form.append("subject", "Lead Tracker Debug Test");
    form.append("text", "If you see this, Mailgun is working from Vercel!");

    const res = await fetch(`${baseUrl}/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`api:${key}`).toString("base64"),
      },
      body: form,
    });

    const body = await res.text();
    return NextResponse.json({
      status: res.status,
      body,
      domain,
      keyPrefix: key?.slice(0, 8) + "...",
      baseUrl,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      domain,
      keyPrefix: key?.slice(0, 8) + "...",
      baseUrl,
    }, { status: 500 });
  }
}
