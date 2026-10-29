import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { mergePostArchive } from "../src/post-archive.js";
import { FALLBACK_POSTS } from "../src/fallback-posts.js";
import { sitemapXml, postUrl } from "../src/sitemap.js";
import { articleMarkup } from "../src/post-view.js";

test("the complete October import is available as articles and discoverable in the sitemap", async () => {
  const report = JSON.parse(await readFile(new URL("../public/imported-posts/import-2026-10-report.json", import.meta.url), "utf8"));
  const archive = JSON.parse(await readFile(new URL("../public/imported-posts/index.json", import.meta.url), "utf8"));
  assert.equal(report.discovered, 503);
  assert.equal(report.imported, report.discovered);
  const published = mergePostArchive(FALLBACK_POSTS, archive);
  const sitemap = sitemapXml(FALLBACK_POSTS, archive);
  const urls = new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]));
  for (const item of report.articles) {
    const entry = archive.find(post => post.slug === item.slug);
    assert.ok(entry, item.slug);
    assert.equal(entry.published_at, item.published_at);
    assert.match(entry.published_at, /^2026-10-/);
    const post = JSON.parse(await readFile(new URL(`../public/imported-posts/${item.slug}.json`, import.meta.url), "utf8"));
    assert.ok(post.content.length > 100);
    assert.ok(post.content_blocks.length > 0);
    assert.ok(articleMarkup(post).includes('<div class="article-body">'));
    // Titles that already exist share a single listing and sitemap entry.
    const visible = published.find(p => p.slug === item.slug || p.title === post.title);
    assert.ok(visible, item.slug);
    assert.ok(urls.has(postUrl(visible.slug)), item.slug);
  }
});
