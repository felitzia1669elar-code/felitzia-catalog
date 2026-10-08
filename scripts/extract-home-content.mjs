import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const translations = html.match(/const translations = (\{[\s\S]*?\n\s{4}\});\s*const seoMeta/);
const catalog = html.match(/const catalogItems = (\[[\s\S]*?\n\s{4}\]);/);
if (!translations || !catalog) throw new Error("Home content literals not found");
const content = {
  translations: vm.runInNewContext(`(${translations[1]})`),
  catalogItems: vm.runInNewContext(`(${catalog[1]})`),
};
for (const filename of ["home-content.json", "dist/home-content.json"]) {
  fs.writeFileSync(filename, JSON.stringify(content) + "\n");
}
console.log(`Home content: ${content.catalogItems.length} services, ${Object.keys(content.translations).join(", ")}`);
