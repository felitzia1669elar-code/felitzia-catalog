import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { onRequest } from "../functions/_middleware.js";
import { detailSeo } from "./seo-copy.mjs";

const staticPosts = JSON.parse(fs.readFileSync("dist/blog-posts.json", "utf8"));
assert.equal(staticPosts.length, 12);
assert.equal(new Set(staticPosts.map((post) => post.id)).size, staticPosts.length);
for (const post of staticPosts) {
  assert.ok(!post.image.startsWith("data:"));
  assert.ok(fs.existsSync(path.join("dist", post.image)));
}
assert.ok(fs.statSync("dist/scripts/blog-data.js").size < 100_000);

const newPost = {
  id: "test-post",
  lang: "all",
  date: "2026-10-08",
  title: { ru: "Тест", ro: "Test în română", en: "Тест" },
  text: { ru: "Русский текст", ro: "Text în română", en: "Русский текст" },
  category: { ru: "Блог", ro: "Blog", en: "Блог" },
  image: "assets/home-main-visual.png",
};

async function request(pathname, { post = null, host = "felitzia1669elar.md" } = {}) {
  const request = new Request(`https://${host}${pathname}`);
  const url = new URL(request.url);
  const env = {
    ASSETS: {
      async fetch(assetUrl) {
        const pathname = new URL(assetUrl).pathname;
        if (pathname === "/blog-posts.json") return new Response(JSON.stringify(staticPosts), { headers: { "content-type": "application/json" } });
        if (pathname === "/home-content.json") return new Response(fs.readFileSync("dist/home-content.json"), { headers: { "content-type": "application/json" } });
        throw new Error(`Unexpected asset ${pathname}`);
      },
    },
    BLOG_POSTS: { async get() { return post ? [post] : []; } },
  };
  const next = async () => {
    let file;
    if (url.pathname === "/") file = "dist/index.html";
    else if (url.pathname === "/article") file = "dist/article.html";
    else if (url.pathname === "/sitemap.xml") file = "dist/sitemap.xml";
    else if (url.pathname.startsWith("/details/")) file = `dist${url.pathname}.html`;
    else if (url.pathname === "/admin") file = "dist/admin.html";
    else return new Response("Not found", { status: 404 });
    return new Response(fs.readFileSync(file, "utf8"), {
      headers: { "content-type": file.endsWith(".xml") ? "application/xml" : "text/html; charset=utf-8" },
    });
  };
  return onRequest({ request, env, next });
}

let response = await request("/?lang=ro");
let body = await response.text();
assert.equal(response.status, 200);
assert.match(body, /<html lang="ro"/);
assert.match(body, /<title>Numerolog și astrolog online — Felitzia<\/title>/);
assert.match(body, /rel="canonical" href="https:\/\/felitzia1669elar\.md\/\?lang=ro"/);
assert.match(body, /<h1 data-i18n="heroTitle">[^<]*<\/h1>/);
assert.match(body, /<h3>Programul destinului<\/h3>/);
assert.doesNotMatch(body, /<h3>Программа судьбы<\/h3>/);

response = await request("/details/astrologiya?lang=en");
body = await response.text();
assert.equal(response.status, 200);
assert.match(body, /<html lang="en"/);
assert.match(body, /rel="canonical" href="https:\/\/felitzia1669elar\.md\/details\/astrologiya\?lang=en"/);
assert.match(body, /<h1 data-field="title">Astrology<\/h1>/);
assert.match(body, /<h3>Soul formula<\/h3>/);
assert.doesNotMatch(body, /<h1 data-field="title">Астрология<\/h1>/);

for (const slug of Object.keys(detailSeo)) {
  for (const lang of ["ru", "ro", "en"]) {
    const page = await request(`/details/${slug}?lang=${lang}`);
    const html = await page.text();
    assert.equal(page.status, 200, `${slug} ${lang}`);
    assert.match(html, new RegExp(`<html lang="${lang}"`), `${slug} ${lang}`);
    assert.match(html, /<h1 data-field="title">[^<]+<\/h1>/, `${slug} ${lang}`);
    assert.match(html, new RegExp(`rel="canonical" href="https://felitzia1669elar.md/details/${slug}`), `${slug} ${lang}`);
  }
}

for (const post of staticPosts) {
  const page = await request(`/article?id=${post.id}&lang=ru`);
  const html = await page.text();
  assert.equal(page.status, 200, post.id);
  assert.match(html, /<h1>[^<]+<\/h1>/, post.id);
  assert.ok(html.includes(`article?id=${post.id}&amp;lang=ru`), post.id);
}

response = await request(`/article?id=${staticPosts[0].id}&lang=ru`);
body = await response.text();
assert.equal(response.status, 200);
assert.match(body, new RegExp(`<h1>${staticPosts[0].title.ru}</h1>`));
assert.match(body, new RegExp(`rel="canonical" href="https://felitzia1669elar.md/article\\?id=${staticPosts[0].id}&amp;lang=ru"`));
assert.doesNotMatch(body, /hreflang="ro"/);

response = await request(`/article?id=${staticPosts[0].id}&lang=ro`);
assert.equal(response.status, 301);
assert.equal(response.headers.get("location"), `https://felitzia1669elar.md/article?id=${staticPosts[0].id}&lang=ru`);

assert.equal((await request("/article?id=unknown")).status, 404);
assert.equal((await request("/unknown-path")).status, 404);
assert.equal((await request("/details/unknown")).status, 404);
response = await request("/", { host: "www.felitzia1669elar.md" });
assert.equal(response.status, 301);
assert.equal(response.headers.get("location"), "https://felitzia1669elar.md/");

response = await request("/sitemap.xml", { post: newPost });
body = await response.text();
assert.equal(response.status, 200);
assert.equal((body.match(/<loc>/g) || []).length, 56);
assert.match(body, /article\?id=test-post&amp;lang=ro/);
assert.doesNotMatch(body, /article\?id=test-post&amp;lang=en/);

console.log("SEO middleware and static blog checks passed.");
