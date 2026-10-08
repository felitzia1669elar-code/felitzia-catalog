import { homeSeo, detailSeo } from "../scripts/seo-copy.mjs";

const SITE = "https://felitzia1669elar.md";
const LANGUAGES = ["ru", "ro", "en"];
const BRAND = { ru: "Фелиция", ro: "Felitzia", en: "Felitzia" };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("&#39;", "&apos;");
}

function localized(value, lang) {
  if (typeof value === "string") return value;
  return value?.[lang] || value?.ru || "";
}

function postLanguages(post) {
  if (post?.lang && post.lang !== "all") return [post.lang];
  const languages = ["ru"];
  for (const lang of ["ro", "en"]) {
    const title = post?.title?.[lang]?.trim();
    const body = post?.text?.[lang]?.trim();
    if (title && body && (title !== localized(post.title, "ru").trim() || body !== localized(post.text, "ru").trim())) {
      languages.push(lang);
    }
  }
  return languages;
}

function articleUrl(id, lang) {
  return `${SITE}/article?id=${encodeURIComponent(id)}&lang=${lang}`;
}

function pageUrl(path, lang) {
  return `${SITE}${path}${lang === "ru" ? "" : `?lang=${lang}`}`;
}

function imageUrl(image) {
  if (!image || image.startsWith("data:")) return `${SITE}/assets/home-main-visual.png`;
  return new URL(image, `${SITE}/`).href;
}

function cleanedDescription(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 170);
}

function replaceHead(html, { title, description, canonical, alternates, image, type = "website", schema }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  output = output.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${safeDescription}">`);
  output = output.replace(/\s*<link rel="canonical"[^>]*>/gi, "");
  output = output.replace(/\s*<link rel="alternate"[^>]*>/gi, "");
  output = output.replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, "");
  output = output.replace(/\s*<script type="application\/ld\+json" id="page-schema">[\s\S]*?<\/script>/gi, "");
  const head = [
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    ...alternates.map(({ lang, href }) => `<link rel="alternate" hreflang="${lang}" href="${escapeHtml(href)}">`),
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="Фелиция 14 / 41">`,
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDescription}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image || `${SITE}/assets/home-main-visual.png`)}">`,
    schema ? `<script type="application/ld+json" id="page-schema">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>` : "",
  ].filter(Boolean).map((line) => `  ${line}`).join("\n");
  return output.replace("</head>", `${head}\n</head>`);
}

function htmlResponse(body, original, status = original.status) {
  const headers = new Headers(original.headers);
  for (const name of ["content-length", "content-encoding", "etag"]) headers.delete(name);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, { status, headers });
}

function articleAlternates(post) {
  const languages = postLanguages(post);
  return [
    { lang: "x-default", href: articleUrl(post.id, languages.includes("ru") ? "ru" : languages[0]) },
    ...languages.map((lang) => ({ lang, href: articleUrl(post.id, lang) })),
  ];
}

function pageAlternates(path) {
  return [
    { lang: "x-default", href: pageUrl(path, "ru") },
    ...LANGUAGES.map((lang) => ({ lang, href: pageUrl(path, lang) })),
  ];
}

function localizeDetail(html, lang) {
  if (lang === "ru") return html;
  const contentMatch = html.match(/const pageContent = (\{[^\r\n]+\});/);
  const uiMatch = html.match(/const detailUi = (\{[^\r\n]+\});/);
  if (!contentMatch || !uiMatch) return html;
  const content = JSON.parse(contentMatch[1])[lang];
  const ui = JSON.parse(uiMatch[1])[lang];
  if (!content || !ui) return html;
  for (const [key, value] of Object.entries(content)) {
    if (key === "items" || key === "slug" || key === "visualAlt") continue;
    const pattern = new RegExp(`(<([a-z][a-z0-9]*)[^>]*data-field="${key}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, "i");
    html = html.replace(pattern, (_, open, _tag, close) => `${open}${escapeHtml(value)}${close}`);
  }
  for (const [key, value] of Object.entries(ui)) {
    const pattern = new RegExp(`(<([a-z][a-z0-9]*)[^>]*data-ui="${key}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, "gi");
    const translated = ["heroQuote", "meta"].includes(key)
      ? value.split("<br>").map(escapeHtml).join("<br>")
      : escapeHtml(value);
    html = html.replace(pattern, (_, open, _tag, close) => `${open}${translated}${close}`);
  }
  const items = content.items.map((item, index) => `<li><span class="item-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></div></li>`).join("");
  html = html.replace(/(<ul class="items" id="detail-items">)[\s\S]*?(<\/ul>)/, `$1${items}$2`);
  html = html.replace(/(<img[^>]*data-field-alt="visualAlt"[^>]*alt=")[^"]*(")/, `$1${escapeHtml(content.visualAlt)}$2`);
  html = html.replaceAll("../index.html?lang=ru#", `../index.html?lang=${lang}#`);
  return html;
}

async function localizeHome(html, lang, context) {
  const response = await context.env.ASSETS.fetch(new URL("/home-content.json", context.request.url));
  if (!response.ok) return html;
  const { translations, catalogItems } = await response.json();
  const copy = translations[lang];
  if (!copy) return html;
  for (const [key, value] of Object.entries(copy)) {
    const pattern = new RegExp(`(<([a-z][a-z0-9]*)[^>]*data-i18n="${key}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, "gi");
    const translated = ["heroQuote", "heroMeta", "packagePriceSummary"].includes(key)
      ? value.split("<br>").map(escapeHtml).join("<br>")
      : escapeHtml(value);
    html = html.replace(pattern, (_, open, _tag, close) => `${open}${translated}${close}`);
  }
  const cards = catalogItems.map((item) => {
    const title = item.title[lang] || item.title.ru;
    const list = item.items[lang] || item.items.ru;
    return `<article class="service-card${title.length > 18 ? " long-title" : ""}">
      <div class="tagline">${escapeHtml(item.tag[lang] || item.tag.ru)}</div>
      <div class="price">${escapeHtml(item.price)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(item.text[lang] || item.text.ru)}</p>
      <ul>${list.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
      <a class="button secondary detail-link" href="/${escapeHtml(item.href)}?lang=${lang}">${escapeHtml(copy.learnMore)}</a>
    </article>`;
  }).join("");
  html = html.replace('<div class="grid" id="catalog-grid"></div>', `<div class="grid" id="catalog-grid">${cards}</div>`);
  html = html.replaceAll("details/paket.html?lang=ru", `details/paket.html?lang=${lang}`);
  return html;
}

async function readPosts(context) {
  const jsonUrl = new URL("/blog-posts.json", context.request.url);
  const staticResponse = await context.env.ASSETS.fetch(jsonUrl);
  const staticPosts = staticResponse.ok ? await staticResponse.json() : [];
  let serverPosts = [];
  if (context.env.BLOG_POSTS) {
    try {
      const stored = await context.env.BLOG_POSTS.get("posts", "json");
      if (Array.isArray(stored)) serverPosts = stored;
    } catch {
      // Static posts remain readable if KV is temporarily unavailable.
    }
  }
  const seen = new Set();
  return [...serverPosts, ...staticPosts].filter((post) => {
    if (!post?.id || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

function renderArticle(post, lang) {
  const title = localized(post.title, lang);
  const image = imageUrl(post.image);
  const paragraphs = Array.isArray(localized(post.content, lang)) ? localized(post.content, lang) : [];
  const t = {
    ru: ["Написать в Telegram", "Смотреть каталог"],
    ro: ["Scrie pe Telegram", "Vezi catalogul"],
    en: ["Write on Telegram", "View catalog"],
  }[lang];
  return `<article class="article-card" id="article">
    <img class="article-image" src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
    <div class="article-body">
      <div class="article-meta"><span>${escapeHtml(post.date)}</span><span>${escapeHtml(localized(post.category, lang))}</span></div>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(localized(post.text, lang))}</p>
      <div class="article-content">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
      <div class="article-actions">
        <a class="button telegram" href="https://t.me/felitzia" target="_blank" rel="noreferrer">${t[0]}</a>
        <a class="button secondary" href="/?lang=${lang}#catalog">${t[1]}</a>
      </div>
    </div>
  </article>`;
}

async function articleResponse(context, url) {
  const id = url.searchParams.get("id");
  if (!id) return new Response("Article not found", { status: 404 });
  const posts = await readPosts(context);
  const post = posts.find((entry) => entry.id === id);
  if (!post) return new Response("Article not found", { status: 404 });
  const languages = postLanguages(post);
  const requestedLang = LANGUAGES.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "ru";
  if (!languages.includes(requestedLang)) {
    return Response.redirect(articleUrl(id, languages.includes("ru") ? "ru" : languages[0]), 301);
  }
  const canonical = articleUrl(id, requestedLang);
  const original = await context.next();
  if (!original.ok) return original;
  const title = `${localized(post.title, requestedLang)} — ${BRAND[requestedLang]}`;
  const description = cleanedDescription(localized(post.text, requestedLang));
  const image = imageUrl(post.image);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: localized(post.title, requestedLang),
    description,
    image,
    datePublished: post.date,
    inLanguage: requestedLang,
    mainEntityOfPage: canonical,
    author: { "@type": "Person", name: BRAND[requestedLang] },
  };
  let html = (await original.text()).replace(/<article class="article-card" id="article"><\/article>/, renderArticle(post, requestedLang));
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${requestedLang}"`);
  html = replaceHead(html, {
    title,
    description,
    canonical,
    alternates: articleAlternates(post),
    image,
    type: "article",
    schema,
  });
  return htmlResponse(html, original);
}

async function sitemapResponse(context) {
  const original = await context.next();
  if (!original.ok) return original;
  let xml = await original.text();
  const existing = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replaceAll("&amp;", "&")));
  const entries = [];
  for (const post of await readPosts(context)) {
    for (const lang of postLanguages(post)) {
      const loc = articleUrl(post.id, lang);
      if (existing.has(loc)) continue;
      entries.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>\n${articleAlternates(post).map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${escapeXml(alternate.href)}" />`).join("\n")}\n    <lastmod>${escapeXml(post.date || new Date().toISOString().slice(0, 10))}</lastmod>\n  </url>`);
    }
  }
  xml = xml.replace("</urlset>", `${entries.join("\n")}\n</urlset>`);
  const headers = new Headers(original.headers);
  headers.set("content-type", "application/xml; charset=utf-8");
  headers.set("cache-control", "no-store");
  for (const name of ["content-length", "content-encoding", "etag"]) headers.delete(name);
  return new Response(xml, { status: 200, headers });
}

export async function onRequest(context) {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") return context.next();
  const url = new URL(context.request.url);
  if (["www.felitzia1669elar.md", "felitzia1669elar.pages.dev"].includes(url.hostname)) {
    return Response.redirect(`${SITE}${url.pathname}${url.search}`, 301);
  }
  const path = url.pathname;
  if (path === "/sitemap.xml") return sitemapResponse(context);
  if (path === "/article" || path === "/article.html") return articleResponse(context, url);
  if (path === "/" || path === "/index.html" || /^\/details\/[^/]+(?:\.html)?$/.test(path)) {
    const slug = path.startsWith("/details/") ? path.split("/").pop().replace(/\.html$/, "") : null;
    if (slug && !detailSeo[slug]) return new Response("Not found", { status: 404 });
    const original = await context.next();
    if (!original.ok || !original.headers.get("content-type")?.includes("text/html")) return original;
    const lang = LANGUAGES.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "ru";
    const publicPath = slug ? `/details/${slug}` : "/";
    const seo = slug ? detailSeo[slug][lang] : homeSeo[lang];
    let html = (await original.text()).replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
    if (slug) html = localizeDetail(html, lang);
    else html = await localizeHome(html, lang, context);
    html = replaceHead(html, {
      ...seo,
      canonical: pageUrl(publicPath, lang),
      alternates: pageAlternates(publicPath),
      image: `${SITE}/assets/home-main-visual.png`,
    });
    if (!slug) {
      html = html.replace(/(<script type="application\/ld\+json" id="site-schema">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
        const data = JSON.parse(json);
        for (const entry of data["@graph"] || []) {
          if (entry["@type"] === "WebSite") Object.assign(entry, { name: seo.title, description: seo.description, inLanguage: lang });
        }
        return `${start}${JSON.stringify(data)}${end}`;
      });
    }
    return htmlResponse(html, original);
  }
  if (["/admin", "/admin.html", "/robots.txt", "/blog-posts.json", "/home-content.json"].includes(path) || path.startsWith("/api/") || path.startsWith("/assets/") || path.startsWith("/scripts/")) {
    return context.next();
  }
  return new Response("Not found", { status: 404 });
}
