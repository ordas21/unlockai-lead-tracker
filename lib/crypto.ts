import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(projectSlug: string): string {
  const random = randomBytes(24).toString("hex");
  return `ulk_${projectSlug}_${random}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const attempt = scryptSync(password, salt, 64);
  return timingSafeEqual(attempt, Buffer.from(hash, "hex"));
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}
