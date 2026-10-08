import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { onRequest } from "../functions/_middleware.js";
import * as postsApi from "../functions/api/posts.js";
import * as sessionApi from "../functions/api/admin-session.js";

const root = path.resolve("dist");
const port = Number(process.env.PORT || 4173);
const kv = new Map();
const localPassword = "local-preview-password-123";
const env = {
  ADMIN_PASSWORD_HASH: createHash("sha256").update(localPassword).digest("hex"),
  ASSETS: { fetch: assetResponse },
  BLOG_POSTS: {
    async get(key, format) { const value = kv.get(key); return format === "json" && value ? JSON.parse(value) : value ?? null; },
    async put(key, value) { kv.set(key, value); },
    async delete(key) { kv.delete(key); },
  },
};
const types = {
  ".css": "text/css", ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".json": "application/json", ".xml": "application/xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".txt": "text/plain",
};

async function assetResponse(url) {
  let pathname = new URL(url).pathname;
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/article") pathname = "/article.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname.startsWith("/details/") && !path.extname(pathname)) pathname += ".html";
  const filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(`${root}${path.sep}`)) return new Response("Not found", { status: 404 });
  try {
    return new Response(await fs.readFile(filename), {
      headers: { "content-type": types[path.extname(filename)] || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const body = ["PUT", "POST", "DELETE"].includes(request.method)
      ? await (async () => { const chunks = []; for await (const chunk of request) chunks.push(chunk); return Buffer.concat(chunks); })()
      : undefined;
    const webRequest = new Request(url, { method: request.method, headers: request.headers, body });
    const context = {
      request: webRequest,
      env,
      next: () => assetResponse(webRequest.url),
    };
    const route = url.pathname === "/api/posts" ? postsApi : url.pathname === "/api/admin-session" ? sessionApi : null;
    const handler = route?.[`onRequest${request.method[0] + request.method.slice(1).toLowerCase()}`];
    const result = handler ? await handler(context) : await onRequest(context);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end(error.stack);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Felitzia preview: http://127.0.0.1:${port}/`);
});
