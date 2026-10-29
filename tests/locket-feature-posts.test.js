import assert from "node:assert/strict";
import test from "node:test";
import { LOCKET_FEATURE_POSTS } from "../src/locket-feature-posts.js";
import { FALLBACK_POSTS } from "../src/fallback-posts.js";
import { mergePostArchive } from "../src/post-archive.js";
import { articleMarkup, archiveView } from "../src/post-view.js";
import { articleSeo } from "../src/post-seo.js";
import { sitemapXml, postUrl } from "../src/sitemap.js";

test("new feature articles remain discoverable alongside database posts", () => {
  const posts = mergePostArchive([{ slug: "admin-post", title: "Admin post", published_at: "2026-10-28" }, ...FALLBACK_POSTS]);
  const cards = archiveView(posts, 1).cards;
  const xml = sitemapXml(posts);
  for (const post of LOCKET_FEATURE_POSTS) {
    const url = postUrl(post.slug);
    assert.ok(cards.includes(`?bai=${post.slug}`));
    assert.equal(xml.split(`<loc>${url}</loc>`).length - 1, 1);
    assert.equal(articleSeo(post).data["@graph"][0].datePublished, "2026-10-29");
    const html = articleMarkup(post);
    assert.ok(html.includes(`<h1>${post.title}</h1>`));
    assert.match(html, /<h2>/);
    assert.match(html, /href="https:\/\/help.locket.com\//);
    for (const match of html.matchAll(/href="\/bai-viet\/\?bai=([^"]+)"/g)) {
      assert.ok(posts.some((item) => item.slug === match[1]), `Missing related article: ${match[1]}`);
    }
  }
});
