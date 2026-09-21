import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const site = "https://felitzia1669elar.md";
const today = "2026-09-21";
const languages = ["ru", "ro", "en"];
const detailDir = "details";

const homeSeo = {
  ru: {
    title: "Фелиция - каталог консультаций",
    description:
      "Фелиция: консультации по нумерологии, астрологии, Таро, рунам, совместимости, родовым программам, карме, здоровью, профессии, бизнесу и финансам.",
    keywords:
      "нумерология, астрология, таро, руны, совместимость, матрица судьбы, программа судьбы, лабиринт кармы, родология, регрессонумерология, консультации Фелиция",
  },
  ro: {
    title: "Felitzia - catalog de consultații",
    description:
      "Felitzia: consultații de numerologie, astrologie, Tarot, rune, compatibilitate, programe de neam, karmă, sănătate, carieră, business și finanțe.",
    keywords:
      "numerologie, astrologie, tarot, rune, compatibilitate, destin, karmă, programe de neam, regresonumerologie, consultații Felitzia",
  },
  en: {
    title: "Felitzia - consultation catalog",
    description:
      "Felitzia: consultations in numerology, astrology, Tarot, runes, compatibility, ancestral programs, karma, health, career, business and finance.",
    keywords:
      "numerology, astrology, tarot, runes, compatibility, destiny matrix, karma, ancestral programs, regression numerology, Felitzia consultations",
  },
};

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function write(file, text) {
  const dir = path.dirname(file);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  const eol = file.endsWith(".html") ? "\r\n" : "\n";
  fs.writeFileSync(file, text.replace(/\r?\n/g, eol));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function addHeadBlock(html, block, marker = '<meta name="description"') {
  const firstLine = block.trim().split("\n")[0].trim();
  if (html.includes(firstLine)) return html;

  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return html;

  const lineEnd = html.indexOf("\n", markerIndex);
  return html.slice(0, lineEnd + 1) + block + html.slice(lineEnd + 1);
}

function upsertMetaContent(html, name, content) {
  const tag = `<meta name="${name}" content="${content}">`;
  const re = new RegExp(`<meta name="${name}" content="[^"]*">`);
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/(<meta name="description" content="[^"]*">\n)/, `$1  ${tag}\n`);
}

function upsertAdminNoindex(file) {
  let html = read(file);
  if (!html.includes('name="robots"')) {
    html = html.replace(
      '<meta name="description" content="Локальный кабинет Фелиции для добавления новостей в блог сайта.">',
      '<meta name="description" content="Локальный кабинет Фелиции для добавления новостей в блог сайта.">\n  <meta name="robots" content="noindex, nofollow">',
    );
  }
  write(file, html);
}

function upsertIndexSeo(file) {
  let html = read(file);
  html = upsertMetaContent(html, "description", homeSeo.ru.description);
  html = upsertMetaContent(html, "keywords", homeSeo.ru.keywords);
  html = addHeadBlock(
    html,
    `  <link rel="canonical" href="${site}/">
  <link rel="alternate" hreflang="x-default" href="${site}/">
  <link rel="alternate" hreflang="ru" href="${site}/">
  <link rel="alternate" hreflang="ro" href="${site}/?lang=ro">
  <link rel="alternate" hreflang="en" href="${site}/?lang=en">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Фелиция 14 / 41">
  <meta property="og:title" content="${homeSeo.ru.title}">
  <meta property="og:description" content="${homeSeo.ru.description}">
  <meta property="og:url" content="${site}/">
`,
    '<meta name="keywords"',
  );

  if (!html.includes("const seoMeta = ")) {
    html = html.replace(
      "    const catalogItems = [\n",
      `    const seoMeta = ${JSON.stringify(homeSeo)};

    function setSeoMeta(selector, attr, value) {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement(selector.startsWith("link") ? "link" : "meta");
        if (selector.includes("canonical")) node.setAttribute("rel", "canonical");
        const propertyMatch = selector.match(/property="([^"]+)/);
        const nameMatch = selector.match(/name="([^"]+)/);
        if (propertyMatch) node.setAttribute("property", propertyMatch[1]);
        if (nameMatch) node.setAttribute("name", nameMatch[1]);
        document.head.appendChild(node);
      }
      node.setAttribute(attr, value);
    }

    function languageUrl(lang) {
      const url = new URL("/", window.location.origin);
      if (lang !== "ru") url.searchParams.set("lang", lang);
      return url.href;
    }

    function updateHomeSeo() {
      const seo = seoMeta[currentLang] || seoMeta.ru;
      const canonical = languageUrl(currentLang);
      document.title = seo.title;
      setSeoMeta('meta[name="description"]', "content", seo.description);
      setSeoMeta('meta[name="keywords"]', "content", seo.keywords);
      setSeoMeta('link[rel="canonical"]', "href", canonical);
      setSeoMeta('meta[property="og:title"]', "content", seo.title);
      setSeoMeta('meta[property="og:description"]', "content", seo.description);
      setSeoMeta('meta[property="og:url"]', "content", canonical);
    }

    const catalogItems = [
`,
    );
  }

  html = html.replace("    function setLanguage(lang) {\n", "    function setLanguage(lang, updateUrl = false) {\n");
  if (!html.includes("      updateHomeSeo();\n      document.querySelectorAll(\"[data-i18n]\")")) {
    html = html.replace(
      "      document.title = translations[currentLang].pageTitle;\n",
      "      document.title = translations[currentLang].pageTitle;\n      updateHomeSeo();\n",
    );
  }
  if (!html.includes("if (updateUrl) {\n        const nextUrl = new URL(window.location.href);")) {
    html = html.replace(
      "      document.querySelectorAll(\"[data-detail-base]\").forEach((link) => {\n        link.href = `${link.dataset.detailBase}?lang=${currentLang}`;\n      });\n",
      "      document.querySelectorAll(\"[data-detail-base]\").forEach((link) => {\n        link.href = `${link.dataset.detailBase}?lang=${currentLang}`;\n      });\n      if (updateUrl) {\n        const nextUrl = new URL(window.location.href);\n        if (currentLang === \"ru\") nextUrl.searchParams.delete(\"lang\");\n        else nextUrl.searchParams.set(\"lang\", currentLang);\n        window.history.replaceState(null, \"\", nextUrl);\n        updateHomeSeo();\n      }\n",
    );
  }
  html = html.replace(
    'button.addEventListener("click", () => setLanguage(button.dataset.lang));',
    'button.addEventListener("click", () => setLanguage(button.dataset.lang, true));',
  );

  write(file, html);
}

function upsertArticleSeo(file) {
  let html = read(file);
  if (!html.includes('rel="canonical" href="https://felitzia1669elar.md/article.html"')) {
    html = html.replace(
      '<meta name="description" content="Статья блога Фелиции о нумерологии, циклах и совместимости.">',
      `<meta name="description" content="Статья блога Фелиции о нумерологии, циклах и совместимости.">
  <link rel="canonical" href="${site}/article.html">
  <link rel="alternate" hreflang="x-default" href="${site}/article.html">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Фелиция 14 / 41">
  <meta property="og:title" content="Статья - Фелиция">
  <meta property="og:description" content="Статья блога Фелиции о нумерологии, циклах и совместимости.">
  <meta property="og:url" content="${site}/article.html">`,
    );
  }

  if (!html.includes("function updateSeo(post, title)")) {
    html = html.replace(
      "    function renderArticle() {\n",
      `    function setMeta(selector, attr, value) {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement("meta");
        const propertyMatch = selector.match(/property="([^"]+)/);
        const nameMatch = selector.match(/name="([^"]+)/);
        if (propertyMatch) node.setAttribute("property", propertyMatch[1]);
        if (nameMatch) node.setAttribute("name", nameMatch[1]);
        document.head.appendChild(node);
      }
      node.setAttribute(attr, value);
    }

    function updateSeo(post, title) {
      const canonical = new URL("/article.html", window.location.origin);
      if (articleId) canonical.searchParams.set("id", articleId);
      canonical.searchParams.set("lang", currentLang);
      document.querySelectorAll('link[rel="alternate"]').forEach((node) => node.remove());
      for (const lang of supportedLanguages) {
        const alternate = document.createElement("link");
        alternate.rel = "alternate";
        alternate.hreflang = lang;
        const alternateUrl = new URL("/article.html", window.location.origin);
        if (articleId) alternateUrl.searchParams.set("id", articleId);
        alternateUrl.searchParams.set("lang", lang);
        alternate.href = alternateUrl.href;
        document.head.appendChild(alternate);
      }
      const defaultAlternate = document.createElement("link");
      defaultAlternate.rel = "alternate";
      defaultAlternate.hreflang = "x-default";
      defaultAlternate.href = canonical.href;
      document.head.appendChild(defaultAlternate);
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical.href;
      const description = localize(post.text) || "Статья блога Фелиции о нумерологии, циклах и совместимости.";
      setMeta('meta[name="description"]', "content", description);
      setMeta('meta[property="og:title"]', "content", title + " - " + ui[currentLang].brandName);
      setMeta('meta[property="og:description"]', "content", description);
      setMeta('meta[property="og:url"]', "content", canonical.href);
      setMeta('meta[property="og:image"]', "content", new URL(post.image, window.location.origin).href);
    }

    function renderArticle() {
`,
    );
    html = html.replace(
      "      document.title = `${title} - ${ui[currentLang].brandName}`;\n",
      "      document.title = `${title} - ${ui[currentLang].brandName}`;\n      updateSeo(post, title);\n",
    );
  }

  write(file, html);
}

function upsertDetailSeo(file) {
  let html = read(file);
  const publicPath = `/${file
    .replace(/^dist[\\/]/, "")
    .replaceAll(path.sep, "/")}`;
  const canonical = `${site}${publicPath}`;
  html = addHeadBlock(
    html,
    `  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="x-default" href="${canonical}">
  <link rel="alternate" hreflang="ru" href="${canonical}">
  <link rel="alternate" hreflang="ro" href="${canonical}?lang=ro">
  <link rel="alternate" hreflang="en" href="${canonical}?lang=en">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Фелиция 14 / 41">
  <meta property="og:url" content="${canonical}">
`,
  );

  if (!html.includes("function updateDetailSeo(content)")) {
    html = html.replace(
      "    function setLanguage(lang, updateUrl = false) {\n",
      `    function updateDetailSeo(content) {
      const canonical = new URL(window.location.pathname, window.location.origin);
      if (currentLang !== "ru") canonical.searchParams.set("lang", currentLang);
      let canonicalLink = document.head.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical.href;
      document.querySelectorAll('link[rel="alternate"]').forEach((node) => node.remove());
      for (const lang of supportedLanguages) {
        const alternate = document.createElement("link");
        alternate.rel = "alternate";
        alternate.hreflang = lang;
        const alternateUrl = new URL(window.location.pathname, window.location.origin);
        if (lang !== "ru") alternateUrl.searchParams.set("lang", lang);
        alternate.href = alternateUrl.href;
        document.head.appendChild(alternate);
      }
      const defaultAlternate = document.createElement("link");
      defaultAlternate.rel = "alternate";
      defaultAlternate.hreflang = "x-default";
      defaultAlternate.href = new URL(window.location.pathname, window.location.origin).href;
      document.head.appendChild(defaultAlternate);
      let ogTitle = document.head.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute("content", \`\${content.title} - \${detailUi[currentLang].brandName}\`);
      let ogDescription = document.head.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute("content", \`\${content.title} - \${detailUi[currentLang].pageDescription}.\`);
      let ogUrl = document.head.querySelector('meta[property="og:url"]');
      if (!ogUrl) {
        ogUrl = document.createElement("meta");
        ogUrl.setAttribute("property", "og:url");
        document.head.appendChild(ogUrl);
      }
      ogUrl.setAttribute("content", canonical.href);
    }

    function setLanguage(lang, updateUrl = false) {
`,
    );
    html = html.replace(
      '      if (description) description.setAttribute("content", `${content.title} - ${ui.pageDescription}.`);\n',
      '      if (description) description.setAttribute("content", `${content.title} - ${ui.pageDescription}.`);\n      updateDetailSeo(content);\n',
    );
  }

  write(file, html);
}

for (const file of ["index.html", path.join("dist", "index.html")]) upsertIndexSeo(file);
for (const file of ["article.html", path.join("dist", "article.html")]) upsertArticleSeo(file);
for (const file of ["admin.html", path.join("dist", "admin.html")]) upsertAdminNoindex(file);

for (const base of [detailDir, path.join("dist", detailDir)]) {
  for (const name of fs.readdirSync(base).filter((entry) => entry.endsWith(".html"))) {
    upsertDetailSeo(path.join(base, name));
  }
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("scripts/blog-data.js"), context);
const posts = context.window.felitziaDefaultPosts || [];
const urls = [];

function languageUrl(pathname, lang) {
  if (pathname.includes("?")) return `${site}${pathname}&lang=${lang}`;
  if (lang === "ru") return `${site}${pathname}`;
  return `${site}${pathname}?lang=${lang}`;
}

function addUrlGroup(pathname, priority = "0.7", changefreq = "monthly", lastmod = today) {
  const alternates = [
    { lang: "x-default", href: languageUrl(pathname, "ru") },
    ...languages.map((lang) => ({ lang, href: languageUrl(pathname, lang) })),
  ];
  for (const alternate of alternates.filter((entry) => entry.lang !== "x-default")) {
    urls.push({ loc: alternate.href, priority, changefreq, lastmod, alternates });
  }
}

addUrlGroup("/", "1.0", "weekly");

for (const name of fs.readdirSync(detailDir).filter((entry) => entry.endsWith(".html")).sort()) {
  addUrlGroup(`/details/${name}`, "0.8", "monthly");
}

for (const post of posts) {
  if (!post.id) continue;
  const base = `/article.html?id=${encodeURIComponent(post.id)}`;
  const alternates = [
    { lang: "x-default", href: `${site}${base}&lang=ru` },
    ...languages.map((lang) => ({ lang, href: `${site}${base}&lang=${lang}` })),
  ];
  for (const alternate of alternates.filter((entry) => entry.lang !== "x-default")) {
    urls.push({
      loc: alternate.href,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: post.date || today,
      alternates,
    });
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${url.alternates
  .map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${escapeXml(alternate.href)}" />`)
  .join("\n")}
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /admin.html

Sitemap: ${site}/sitemap.xml
`;

for (const file of ["sitemap.xml", path.join("dist", "sitemap.xml")]) write(file, sitemap);
for (const file of ["robots.txt", path.join("dist", "robots.txt")]) write(file, robots);

console.log(`SEO files updated. Sitemap URLs: ${urls.length}`);
