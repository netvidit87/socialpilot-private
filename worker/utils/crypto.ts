/**
 * Simple encryption helpers for tokens.
 * Uses Web Crypto API (available in Workers).
 * ENCRYPTION_KEY must be a 32-byte base64 string.
 */

const ALGO = 'AES-GCM';
const IV_LENGTH = 12;

function getKeyBytes(keyB64: string): Uint8Array {
  const bin = atob(keyB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encrypt(plaintext: string, keyB64: string): Promise<string> {
  const keyBytes = getKeyBytes(keyB64);
  const key = await crypto.subtle.importKey('raw', keyBytes, ALGO, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  let s = '';
  for (let i = 0; i < combined.length; i++) s += String.fromCharCode(combined[i]);
  return btoa(s);
}

export async function decrypt(ciphertextB64: string, keyB64: string): Promise<string> {
  const keyBytes = getKeyBytes(keyB64);
  const key = await crypto.subtle.importKey('raw', keyBytes, ALGO, false, ['decrypt']);
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

export async function hashPassword(password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(password + secret);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export async function verifyPassword(password: string, hash: string, secret: string): Promise<boolean> {
  const computed = await hashPassword(password, secret);
  return computed === hash;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/[+/=]/g, '').slice(0, length);
}
