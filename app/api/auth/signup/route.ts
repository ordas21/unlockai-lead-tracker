import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import getDb from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/mail";

const ALLOWED_DOMAIN = "unlockaiagency.com";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate email domain
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      return NextResponse.json(
        { error: `Only @${ALLOWED_DOMAIN} email addresses can sign up` },
        { status: 403 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user already exists
    const existing = db.prepare("SELECT id, verified FROM users WHERE email = ?").get(email.toLowerCase()) as { id: string; verified: number } | undefined;
    if (existing?.verified) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const id = existing?.id || uuid();
    const passwordHash = hashPassword(password);
    const verifyToken = generateToken();

    if (existing) {
      // Update unverified user
      db.prepare(
        "UPDATE users SET name = ?, password_hash = ?, verify_token = ? WHERE id = ?"
      ).run(name, passwordHash, verifyToken, id);
    } else {
      db.prepare(
        "INSERT INTO users (id, email, name, password_hash, verify_token) VALUES (?, ?, ?, ?, ?)"
      ).run(id, email.toLowerCase(), name, passwordHash, verifyToken);
    }

    // Build verification URL
    const baseUrl = req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
      : new URL(req.url).origin;
    const verifyUrl = `${baseUrl}/verify?token=${verifyToken}`;

    await sendVerificationEmail(email, name, verifyUrl);

    return NextResponse.json({ success: true, message: "Check your email to verify your account" }, { status: 201 });
  } catch (err: unknown) {
    console.error("Signup error:", err);
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
