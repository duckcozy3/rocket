import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public HTML has unique canonical URLs, social metadata and valid structured data", async () => {
  const paths = ["index.html", ...["len-gold", "uy-tin", "bai-viet", "huong-dan", "cong-tac-vien", "lien-he", "tai-dns"].map(path => `${path}/index.html`)];
  const urls = new Set();
  for (const path of paths) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    assert.ok(!urls.has(canonical), path);
    urls.add(canonical);
    assert.equal((html.match(/property="og:title"/g) || []).length, 1, path);
    assert.ok(html.includes(`property="og:url" content="${canonical}"`), path);
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), path);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json" data-page-seo>(.*?)<\/script>/s)[1]);
    assert.equal(data["@context"], "https://schema.org");
    assert.ok(data["@graph"].some(item => item["@type"] === "WebPage" && item.url === canonical), path);
  }
});
