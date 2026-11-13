import type { Env } from '../types';
import { hashPassword, verifyPassword, generateId, generateToken } from './crypto';

const SESSION_COOKIE = 'sp_session';
const SESSION_DAYS = 30;

export async function getSessionUserId(request: Request, env: Env): Promise<string | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  const token = match[1];
  const tokenHash = await hashPassword(token, env.SESSION_SECRET);

  const row = await env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
    return null;
  }

  // Touch last_active
  await env.DB.prepare(
    `UPDATE sessions SET last_active_at = datetime('now') WHERE token_hash = ?`
  )
    .bind(tokenHash)
    .run();

  return row.user_id;
}

export async function createSession(userId: string, env: Env): Promise<string> {
  const token = generateToken(48);
  const tokenHash = await hashPassword(token, env.SESSION_SECRET);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  )
    .bind(generateId(), userId, tokenHash, expires.toISOString())
    .run();

  return token;
}

export function sessionCookie(token: string, maxAgeDays = SESSION_DAYS): string {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  // SameSite=Lax required so cookie is sent after Facebook OAuth redirect
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function ensureSingleUser(env: Env): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT id FROM users LIMIT 1`).first<{ id: string }>();
  return row?.id ?? null;
}

export { hashPassword, verifyPassword, generateId };
