import test from "node:test";
import assert from "node:assert/strict";
import { articleSeo } from "../src/post-seo.js";

test("article metadata matches the canonical article and escapes untrusted titles", () => {
  const seo = articleSeo({ slug: "huong-dan", title: '</script><script>alert("x")</script>', excerpt: "Mẹo & hướng dẫn", published_at: "2026-10-04 12:08:55", cover: `/images/imported-posts/${"a".repeat(24)}.webp` });
  const [article, breadcrumbs] = seo.data["@graph"];
  assert.equal(article.url, "https://locketgold.info/bai-viet/?bai=huong-dan");
  assert.equal(article.datePublished, "2026-10-04T12:08:55Z");
  assert.equal(breadcrumbs.itemListElement[2].item, article.url);
  assert.equal(article.image[0], `https://locketgold.info/images/imported-posts/${"a".repeat(24)}.webp`);
  assert.ok(!seo.html.includes('<script>alert'));
  const json = seo.html.match(/<script[^>]*>(.*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(json), seo.data);
});

test("article metadata does not invent a date or use untrusted cover URLs", () => {
  for (const published_at of ["", "invalid", "2026-02-30"]) {
    const article = articleSeo({ slug: "test", title: "Bài viết", published_at, cover: "https://example.org/image.png" }).data["@graph"][0];
    assert.equal(article.datePublished, undefined);
    assert.equal(article.dateModified, undefined);
    assert.equal(article.image, undefined);
  }
});
