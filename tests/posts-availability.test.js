import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { LOCKET_FEATURE_POSTS } from "../src/locket-feature-posts.js";

const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire("miniflare");
const { buildSync } = wranglerRequire("esbuild");

test("article pages survive a D1 database without the posts table in the Workers runtime", async (t) => {
  const archive = JSON.parse(await readFile(new URL("../public/imported-posts/index.json", import.meta.url), "utf8"));
  const imported = archive.find((post) => !post.duplicate_of);
  const fullPost = await readFile(new URL(`../public/imported-posts/${imported.slug}.json`, import.meta.url), "utf8");
  const script = buildSync({
    entryPoints: [fileURLToPath(new URL("../worker/index.js", import.meta.url))],
    bundle: true, format: "esm", platform: "browser", write: false,
  }).outputFiles[0].text;
  const shell = '<html><head><title>Posts</title><link rel="canonical" href="https://locketgold.info/bai-viet/"><meta name="description" content="Posts"></head><body><div class="page-hero"></div><div id="post-list"></div><div class="post-archive-controls">old pagination</div></body></html>';
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script, compatibilityDate: "2026-09-29", d1Databases: ["DB"],
    serviceBindings: { ASSETS: async (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/bai-viet/") return new Response(shell, { headers: { "Content-Type": "text/html", ETag: "old-shell" } });
      if (path === "/imported-posts/index.json") return Response.json(archive);
      if (path === `/imported-posts/${imported.slug}.json`) return new Response(fullPost, { headers: { "Content-Type": "application/json" } });
      return new Response("Not found", { status: 404 });
    } },
  }));
  t.after(() => mf.dispose());
  const request = (path, options) => mf.dispatchFetch(`https://locketgold.info${path}`, options);

  const listing = await request("/bai-viet/");
  assert.equal(listing.status, 200);
  assert.equal(listing.headers.get("Cache-Control"), "no-store");
  const html = await listing.text();
  for (const post of LOCKET_FEATURE_POSTS) assert.ok(html.includes(`?bai=${post.slug}`));
  assert.ok(!html.includes("old pagination"));
  assert.match(html, /\?trang=2/);

  for (const post of [...LOCKET_FEATURE_POSTS, imported]) {
    const response = await request(`/bai-viet/?bai=${post.slug}`);
    assert.equal(response.status, 200, post.slug);
    assert.equal(response.headers.get("ETag"), null);
    const body = await response.text();
    assert.ok(body.includes(`data-rendered-post="${post.slug}"`));
    assert.ok(body.includes('"@type":"BlogPosting"'));
  }
  const head = await request(`/bai-viet/?bai=${LOCKET_FEATURE_POSTS[0].slug}`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  const unknown = await request("/bai-viet/?bai=unknown-database-post");
  assert.equal(unknown.status, 503);
  assert.equal(unknown.headers.get("Cache-Control"), "no-store");

  const db = await mf.getD1Database("DB");
  await db.exec("CREATE TABLE posts (slug TEXT, title TEXT, excerpt TEXT, content TEXT, published_at TEXT, status TEXT)");
  await db.prepare("INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?)").bind("database-post", "Database article", "Summary", "Body", "2026-10-29", "published").run();
  const recovered = await request("/bai-viet/");
  assert.equal(recovered.status, 200);
  assert.equal(recovered.headers.get("Cache-Control"), "public, max-age=300");
  assert.ok((await recovered.text()).includes("?bai=database-post"));
  const missing = await request("/bai-viet/?bai=unknown-database-post");
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("X-Robots-Tag"), "noindex");
});
