import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { postText, postHref } from "../src/post-brand.js";
import { articleMarkup } from "../src/post-view.js";
import { articleSeo } from "../src/post-seo.js";

test("source brand and purchase links point to the owner's existing pages", () => {
  assert.equal(postHref("https://locketgold.app/dich-vu-vip"), "https://locketgold.info/len-gold/");
  assert.equal(postHref("https://www.locketgold.app/huong-dan/"), "https://locketgold.info/huong-dan/");
  assert.equal(postHref("https://locketgold.app/lien-he"), "https://locketgold.info/lien-he/");
  assert.equal(postHref("https://locketgold.app/bai-viet/example"), "https://locketgold.info/bai-viet/?bai=example");
  assert.equal(postHref("https://locketgold.app/bai-viet?trang=2"), "https://locketgold.info/bai-viet/?trang=2");
  assert.equal(postHref("https://locketgold.app/bai-viet/bad%"), "https://locketgold.info/bai-viet/");
  assert.equal(postHref("https://help.locket.com/en/articles/example"), "https://help.locket.com/en/articles/example");
  assert.equal(postText("Trần Quốc Vũ — locketgold.app"), "Locket Gold — locketgold.info");
  assert.equal(postText("Xem https://locketgold.app/dich-vu-vip."), "Xem https://locketgold.info/len-gold/.");
});

test("every imported article renders with the owner's branding and no source-site links", async () => {
  const archive = JSON.parse(await readFile(new URL("../public/imported-posts/index.json", import.meta.url), "utf8"));
  for (const entry of archive) {
    const post = JSON.parse(await readFile(new URL(`../public/imported-posts/${entry.slug}.json`, import.meta.url), "utf8"));
    const html = articleMarkup(post);
    assert.ok(!/locketgold\.app|(?:Trần\s+)?Quốc\s+Vũ/iu.test(html), entry.slug);
    assert.ok(!/href="https:\/\/locketgold.info\/dich-vu-vip/.test(html), entry.slug);
    assert.ok(html.includes('href="/lien-he/">Locket Gold</a>'));
    const seo = articleSeo(post);
    assert.ok(!/locketgold\.app/iu.test(seo.html), entry.slug);
  }
});
