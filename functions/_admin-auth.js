const SESSION_SECONDS = 12 * 60 * 60;
const SESSION_PREFIX = "admin-session:";
// Existing password digest is kept server-side until ADMIN_PASSWORD_HASH is set in Cloudflare.
const FALLBACK_HASH = "9e638655b8b28add146688125e82f45af78b9ebb961a9afa503b2e47d590e4db";

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sessionToken(request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)felitzia_admin=([a-f0-9]{64})(?:;|$)/)?.[1] || "";
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `felitzia_admin=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function verifyPassword(env, password) {
  if (typeof password !== "string" || !password) return false;
  const expected = env.ADMIN_PASSWORD_HASH || FALLBACK_HASH;
  return (await sha256(password)) === expected;
}

export async function createSession(env) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  await env.BLOG_POSTS.put(SESSION_PREFIX + await sha256(token), "1", { expirationTtl: SESSION_SECONDS });
  return token;
}

export async function isAdminSession(request, env) {
  const token = sessionToken(request);
  return Boolean(token && await env.BLOG_POSTS.get(SESSION_PREFIX + await sha256(token)));
}

export async function deleteSession(request, env) {
  const token = sessionToken(request);
  if (token) await env.BLOG_POSTS.delete(SESSION_PREFIX + await sha256(token));
}
