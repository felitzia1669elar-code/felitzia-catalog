import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { onRequest } from "../functions/_middleware.js";

const root = path.resolve("dist");
const types = {
  ".css": "text/css", ".html": "text/html; charset=utf-8", ".js": "text/javascript",
  ".json": "application/json", ".xml": "application/xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".mp4": "video/mp4", ".txt": "text/plain",
};

async function assetResponse(url) {
  let pathname = new URL(url).pathname;
  if (pathname === "/api/posts") return Response.json({ posts: [] });
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
    const webRequest = new Request(url, { method: request.method });
    const context = {
      request: webRequest,
      env: {
        ASSETS: { fetch: assetResponse },
        BLOG_POSTS: { async get() { return []; } },
      },
      next: () => assetResponse(webRequest.url),
    };
    const result = await onRequest(context);
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain" });
    response.end(error.stack);
  }
}).listen(4173, "127.0.0.1", () => {
  console.log("Felitzia preview: http://127.0.0.1:4173/");
});
