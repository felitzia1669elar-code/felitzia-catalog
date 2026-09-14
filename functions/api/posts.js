const POSTS_KEY = "posts";
const PASSWORD_HASH = "c0815050ab5352d75afa91bab57d6d72e46680ace2ad6d08a78ad58ccd3ec35f";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function textValue(value, fallback = "", maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function imageValue(value) {
  const image = textValue(value, "", 8000000);
  if (!image) return "assets/home-main-visual.png";
  if (image.startsWith("data:image/") && image.length < 10000) return "assets/home-main-visual.png";
  if (image.startsWith("data:image/")) return image;
  return image.slice(0, 1000);
}

function localized(value, fallback) {
  if (typeof value === "string") {
    const text = textValue(value, fallback);
    return { ru: text, ro: text, en: text };
  }
  return {
    ru: textValue(value && value.ru, fallback),
    ro: textValue(value && value.ro, fallback),
    en: textValue(value && value.en, fallback)
  };
}

function normalizePost(post) {
  const id = textValue(post && post.id) || String(Date.now());
  const title = localized(post && post.title, "Новая запись");
  const text = localized(post && post.text, "");
  return {
    id,
    lang: "all",
    date: textValue(post && post.date) || new Date().toISOString().slice(0, 10),
    category: localized(post && post.category, "Новость"),
    title,
    text,
    content: post && post.content ? localized(post.content, "") : null,
    image: imageValue(post && post.image),
    updatedAt: new Date().toISOString()
  };
}

async function sha256(value) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isAuthorized(request) {
  const body = await request.clone().json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  return (await sha256(password)) === PASSWORD_HASH ? body : null;
}

async function readPosts(env) {
  const posts = await env.BLOG_POSTS.get(POSTS_KEY, "json");
  return Array.isArray(posts) ? posts : [];
}

async function writePosts(env, posts) {
  await env.BLOG_POSTS.put(POSTS_KEY, JSON.stringify(posts.slice(0, 100)));
}

function upsertPost(posts, post) {
  const normalized = normalizePost(post);
  const index = posts.findIndex((entry) => entry.id === normalized.id);
  if (index >= 0) {
    const nextPosts = [...posts];
    nextPosts[index] = normalized;
    return nextPosts;
  }
  return [normalized, ...posts];
}

export async function onRequestGet({ env }) {
  return json({ posts: await readPosts(env) });
}

export async function onRequestPut({ request, env }) {
  const body = await isAuthorized(request);
  if (!body) return json({ error: "unauthorized" }, 401);

  const posts = Array.isArray(body.posts)
    ? body.posts.map(normalizePost)
    : upsertPost(await readPosts(env), body.post || {});
  await writePosts(env, posts);
  return json({ posts });
}

export async function onRequestDelete({ request, env }) {
  const body = await isAuthorized(request);
  if (!body) return json({ error: "unauthorized" }, 401);

  const id = textValue(body.id);
  if (!id) return json({ error: "missing id" }, 400);

  const posts = (await readPosts(env)).filter((post) => post.id !== id);
  await writePosts(env, posts);
  return json({ posts });
}
