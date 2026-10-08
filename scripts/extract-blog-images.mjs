import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source = path.join("scripts", "blog-data.js");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(source, "utf8"), context);

const posts = JSON.parse(JSON.stringify(context.window.felitziaDefaultPosts || []));
const extensions = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif" };

for (const post of posts) {
  const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(post.image || "");
  if (!match) continue;
  const relative = `assets/blog/${post.id}.${extensions[match[1]]}`;
  const bytes = Buffer.from(match[2], "base64");
  for (const base of [".", "dist"]) {
    const target = path.join(base, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  post.image = relative;
}

const script = `window.felitziaDefaultPosts = ${JSON.stringify(posts, null, 2)};\n`;
for (const base of [".", "dist"]) {
  fs.writeFileSync(path.join(base, source), script);
  fs.writeFileSync(path.join(base, "blog-posts.json"), `${JSON.stringify(posts)}\n`);
}
console.log(`Prepared ${posts.length} static blog posts without embedded image data.`);
