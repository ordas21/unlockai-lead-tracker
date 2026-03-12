import { NextRequest } from "next/server";
import getDb from "./db";
import { hashKey } from "./crypto";

type ApiKeyAuth = {
  valid: true;
  projectId: string;
  projectSlug: string;
} | {
  valid: false;
};

export function authenticate(req: NextRequest): ApiKeyAuth {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { valid: false };

  const db = getDb();
  const hash = hashKey(apiKey);

  const row = db.prepare(`
    SELECT ak.project_id, p.slug
    FROM api_keys ak
    JOIN projects p ON p.id = ak.project_id
    WHERE ak.key_hash = ? AND ak.revoked_at IS NULL
  `).get(hash) as { project_id: string; slug: string } | undefined;

  if (!row) return { valid: false };

  return { valid: true, projectId: row.project_id, projectSlug: row.slug };
}

// Admin auth: supports both legacy x-admin-secret header AND session cookies
export function authenticateAdmin(req: NextRequest): boolean {
  // 1. Check legacy admin secret header
  const secret = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (expected && secret && secret === expected) return true;

  // 2. Check session cookie
  const sessionId = req.cookies.get("lt_session")?.value;
  if (!sessionId) return false;

  const db = getDb();
  const session = db.prepare(`
    SELECT u.id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.verified = 1
  `).get(sessionId) as { id: string } | undefined;

  return !!session;
}
