import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id FROM users WHERE verify_token = ? AND verified = 0")
    .get(token) as { id: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  db.prepare("UPDATE users SET verified = 1, verify_token = NULL WHERE id = ?").run(user.id);

  // Redirect to login with success message
  const baseUrl = req.headers.get("x-forwarded-host")
    ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
    : new URL(req.url).origin;

  return NextResponse.redirect(`${baseUrl}/login?verified=1`);
}
