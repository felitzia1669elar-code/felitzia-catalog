import { createSession, deleteSession, isAdminSession, sessionCookie, verifyPassword } from "../_admin-auth.js";

function json(body, status = 200, cookie) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  if (cookie) headers["set-cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

export async function onRequestGet({ request, env }) {
  return json({ authenticated: await isAdminSession(request, env) });
}

export async function onRequestPost({ request, env }) {
  const { password } = await request.json().catch(() => ({}));
  if (!await verifyPassword(env, password)) return json({ error: "unauthorized" }, 401);
  const token = await createSession(env);
  return json({ authenticated: true }, 200, sessionCookie(token));
}

export async function onRequestDelete({ request, env }) {
  await deleteSession(request, env);
  return json({ authenticated: false }, 200, sessionCookie("", 0));
}
