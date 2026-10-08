import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { onRequest as middleware } from "../functions/_middleware.js";
import * as postsApi from "../functions/api/posts.js";
import * as sessionApi from "../functions/api/admin-session.js";

const archive = JSON.parse(fs.readFileSync("dist/blog-posts.json", "utf8"));
const store = new Map();
const password = "test-only-password";
const env = {
  ADMIN_PASSWORD_HASH: createHash("sha256").update(password).digest("hex"),
  ASSETS: { async fetch(url) {
    const pathname = new URL(url).pathname;
    if (pathname === "/blog-posts.json") return Response.json(archive);
    throw new Error(`Unexpected asset ${pathname}`);
  } },
  BLOG_POSTS: {
    async get(key, format) { const value = store.get(key); return format === "json" && value ? JSON.parse(value) : value ?? null; },
    async put(key, value) { store.set(key, value); },
    async delete(key) { store.delete(key); },
  },
};

function context(pathname, method = "GET", body, cookie = "") {
  const request = new Request(`https://felitzia1669elar.md${pathname}`, {
    method, headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { request, env, next: async () => new Response(fs.readFileSync(`dist${pathname}`, "utf8"), { headers: { "content-type": "application/xml" } }) };
}

let response = await postsApi.onRequestGet(context("/api/posts"));
assert.equal((await response.json()).posts.length, archive.length, "The admin list includes old articles");
assert.equal((await sessionApi.onRequestGet(context("/api/admin-session")).then((r) => r.json())).authenticated, false);
assert.equal((await sessionApi.onRequestPost(context("/api/admin-session", "POST", { password: "wrong" }))).status, 401);
assert.equal((await postsApi.onRequestPut(context("/api/posts", "PUT", { post: archive[0] }))).status, 401);

response = await sessionApi.onRequestPost(context("/api/admin-session", "POST", { password }));
assert.equal(response.status, 200);
const cookie = response.headers.get("set-cookie").split(";")[0];
assert.match(response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Strict/);
assert.equal((await sessionApi.onRequestGet(context("/api/admin-session", "GET", undefined, cookie)).then((r) => r.json())).authenticated, true);

const old = archive[0];
const edit = {
  ...old,
  title: { ru: "Обновлено", ro: "Actualizat", en: "Updated" },
  text: { ru: "Русский текст", ro: "Text în română", en: "English text" },
};
response = await postsApi.onRequestPut(context("/api/posts", "PUT", { post: edit }, cookie));
assert.equal(response.status, 200);
let posts = (await response.json()).posts;
assert.equal(posts.length, archive.length);
assert.equal(posts.find((post) => post.id === old.id).title.ro, "Actualizat");
assert.deepEqual(posts.find((post) => post.id === old.id).content, old.content, "Editing keeps original article content");

response = await middleware({ ...context("/article?id=" + old.id + "&lang=ro"), next: async () => new Response(fs.readFileSync("dist/article.html", "utf8"), { headers: { "content-type": "text/html" } }) });
assert.equal(response.status, 200);
assert.match(await response.text(), /<h1>Actualizat<\/h1>/);

response = await postsApi.onRequestDelete(context("/api/posts", "DELETE", { id: old.id }, cookie));
posts = (await response.json()).posts;
assert.equal(posts.length, archive.length - 1);
assert.ok(!posts.some((post) => post.id === old.id));
assert.equal((await middleware({ ...context("/article?id=" + old.id + "&lang=ru"), next: async () => new Response(fs.readFileSync("dist/article.html", "utf8")) })).status, 404);
response = await middleware(context("/sitemap.xml"));
assert.ok(!(await response.text()).includes(`/article?id=${old.id}&amp;lang=ru`), "Deleted archive article is absent from sitemap");

const fresh = {
  id: "new-local-test",
  date: "2026-10-08",
  title: { ru: "Новая статья", ro: "Articol nou", en: "New article" },
  text: { ru: "Текст", ro: "Text român", en: "English text" },
  category: { ru: "Блог", ro: "", en: "" },
};
response = await postsApi.onRequestPut(context("/api/posts", "PUT", { post: fresh }, cookie));
posts = (await response.json()).posts;
assert.equal(posts.find((post) => post.id === fresh.id).category.ro, "Articol");
assert.equal(posts.find((post) => post.id === fresh.id).category.en, "Article");
assert.equal((await middleware({ ...context("/article?id=new-local-test&lang=en"), next: async () => new Response(fs.readFileSync("dist/article.html", "utf8"), { headers: { "content-type": "text/html" } }) })).status, 200);
response = await postsApi.onRequestDelete(context("/api/posts", "DELETE", { id: fresh.id }, cookie));
assert.ok(!(await response.json()).posts.some((post) => post.id === fresh.id));

response = await sessionApi.onRequestDelete(context("/api/admin-session", "DELETE", undefined, cookie));
assert.equal(response.status, 200);
assert.equal((await sessionApi.onRequestGet(context("/api/admin-session", "GET", undefined, cookie)).then((r) => r.json())).authenticated, false);
console.log("Blog archive, localized edit, server login, deletion, and sitemap: OK");
