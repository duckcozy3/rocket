import { mergePostArchive } from "./post-archive.js";

export const SITE_URL = "https://locketgold.info";
export const PUBLIC_PATHS = ["/", "/len-gold/", "/spotify/", "/uy-tin/", "/bai-viet/", "/huong-dan/", "/cong-tac-vien/", "/lien-he/", "/tai-dns/"];
// Last recorded changes to the public page files in repository history.
const PAGE_LASTMOD = "2026-10-17";

export function postUrl(slug) {
  return `${SITE_URL}/bai-viet/?bai=${encodeURIComponent(slug)}`;
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

function publicationDate(value) {
  // D1 stores UTC timestamps without a timezone; use only the known calendar date.
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
}

export function sitemapXml(existing = [], imported = []) {
  const entries = PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastmod: path === "/spotify/" ? "2026-10-30" : PAGE_LASTMOD,
    priority: path === "/" ? "1.0000" : "0.9000",
  }));
  for (const post of mergePostArchive(existing, imported)) {
    if (!/^[a-z0-9-]{1,200}$/.test(post.slug)) continue;
    entries.push({ url: postUrl(post.slug), lastmod: publicationDate(post.published_at), priority: "0.8000" });
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.map(({ url, lastmod, priority }) => [
    "  <url>",
    `    <loc>${xmlEscape(url)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    "    <changefreq>daily</changefreq>",
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n")).join("\n")}\n</urlset>\n`;
}
