import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";

/**
 * Session management.
 *
 * - Opaque 256-bit token in an httpOnly, SameSite=Lax cookie.
 * - Only the SHA-256 hash of the token is stored server-side, so a database
 *   leak cannot be replayed as a session.
 * - Each session carries a CSRF token; mutating requests must echo it in the
 *   `x-csrf-token` header (double-submit pattern) in addition to the
 *   same-origin check in `lib/api/handler.ts`.
 */

const COOKIE_NAME = "soultribe_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<{ csrfToken: string }> {
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const now = Date.now();

  await db.insert(sessions).values({
    id: hash(token),
    userId,
    csrfToken,
    expiresAt: now + SESSION_TTL_MS,
    createdAt: now,
  });

  // Opportunistically clear expired sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, now));

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { csrfToken };
}

export interface SessionInfo {
  user: User;
  csrfToken: string;
  sessionId: string;
}

export async function getSession(): Promise<SessionInfo | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const id = hash(token);
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!row || row.expiresAt < Date.now()) {
    if (row) await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || user.status === "deactivated") return null;

  return { user, csrfToken: row.csrfToken, sessionId: id };
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.delete(sessions).where(eq(sessions.id, hash(token)));
  }
  cookies().delete(COOKIE_NAME);
}

export async function touchLastActive(userId: string): Promise<void> {
  await db.update(users).set({ lastActiveAt: Date.now() }).where(eq(users.id, userId));
}
