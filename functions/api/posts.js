import { isAdminSession } from "../_admin-auth.js";
import { deleteBlogPost, readBlogData, upsertBlogPost } from "../_blog-store.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function string(value, max = 5000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function localized(value, max = 5000) {
  if (typeof value === "string") return { ru: string(value, max), ro: "", en: "" };
  return Object.fromEntries(["ru", "ro", "en"].map((lang) => [lang, string(value?.[lang], max)]));
}

function normalizePost(input, previous) {
  const id = string(input?.id, 150) || crypto.randomUUID();
  const title = localized(input?.title, 200);
  const text = localized(input?.text);
  if (!title.ru || !text.ru) return null;
  const category = localized(input?.category, 100);
  const rawImage = string(input?.image, 8_000_000);
  const image = rawImage.startsWith("data:image/") && rawImage.length >= 10000
    ? rawImage : rawImage.startsWith("data:") ? "assets/home-main-visual.png"
    : rawImage.slice(0, 1000) || "assets/home-main-visual.png";
  return {
    id,
    lang: "all",
    date: /^\d{4}-\d{2}-\d{2}$/.test(input?.date) ? input.date : new Date().toISOString().slice(0, 10),
    category: {
      ru: category.ru || "Новость",
      ro: category.ro || (title.ro && text.ro ? "Articol" : ""),
      en: category.en || (title.en && text.en ? "Article" : ""),
    },
    title,
    text,
    content: previous?.content || null,
    image,
    updatedAt: new Date().toISOString(),
  };
}

export async function onRequestGet({ request, env }) {
  return json({ posts: (await readBlogData(env, request.url)).posts });
}

export async function onRequestPut({ request, env }) {
  if (!await isAdminSession(request, env)) return json({ error: "unauthorized" }, 401);
  const { post } = await request.json().catch(() => ({}));
  if (!post || typeof post !== "object") return json({ error: "missing post" }, 400);
  const data = await readBlogData(env, request.url);
  const previous = data.posts.find((entry) => entry.id === post.id);
  const normalized = normalizePost(post, previous);
  if (!normalized) return json({ error: "Russian title and description required" }, 400);
  return json({ posts: await upsertBlogPost(env, request.url, normalized) });
}

export async function onRequestDelete({ request, env }) {
  if (!await isAdminSession(request, env)) return json({ error: "unauthorized" }, 401);
  const { id } = await request.json().catch(() => ({}));
  if (!string(id, 150)) return json({ error: "missing id" }, 400);
  return json({ posts: await deleteBlogPost(env, request.url, id) });
}
