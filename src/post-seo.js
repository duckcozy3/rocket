import { postForDisplay } from "./post-brand.js";
import { SITE_URL, postUrl } from "./sitemap.js";

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function articleSeo(rawPost) {
  const post = postForDisplay(rawPost);
  const url = postUrl(post.slug);
  const description = (post.excerpt || post.title).replace(/\s+/g, " ").trim();
  const imagePath = [post.cover, post.thumbnail].find((path) => /^\/images\/imported-posts\/[a-f0-9]{24}\.(png|jpe?g|webp|gif)$/.test(path || ""));
  const image = `${SITE_URL}${imagePath || "/images/logo.png"}`;
  const organization = { "@type": "Organization", name: "Locket Gold", url: SITE_URL };
  const article = {
    "@type": "BlogPosting", "@id": `${url}#article`, headline: post.title,
    description, url, mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "vi-VN", author: organization, publisher: organization,
    ...(imagePath ? { image: [image] } : {}),
    ...(post.category ? { articleSection: post.category } : {}),
  };
  const date = String(post.published_at || "").trim();
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date) ? `${date.replace(" ", "T")}Z` : date;
  if (/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(normalized) && Number.isFinite(Date.parse(normalized)) && new Date(normalized).toISOString().slice(0, 10) === normalized.slice(0, 10)) article.datePublished = normalized;
  const breadcrumbs = { "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Bài viết", item: `${SITE_URL}/bai-viet/` },
    { "@type": "ListItem", position: 3, name: post.title, item: url },
  ] };
  const data = { "@context": "https://schema.org", "@graph": [article, breadcrumbs] };
  const tags = { "og:type": "article", "og:title": post.title, "og:description": description, "og:url": url, "og:image": image, "og:locale": "vi_VN", "og:site_name": "Locket Gold", "twitter:card": "summary_large_image", "twitter:title": post.title, "twitter:description": description, "twitter:image": image };
  const html = Object.entries(tags).map(([key, value]) => `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${escape(value)}" data-post-seo>`).join("") + `<script type="application/ld+json" data-post-seo>${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
  return { description, data, html };
}
