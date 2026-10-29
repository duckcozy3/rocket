const SITE_URL = "https://locketgold.info";

export function postHref(value) {
  const href = String(value ?? "");
  let url;
  try { url = new URL(href); } catch { return href; }
  if (!["locketgold.app", "www.locketgold.app"].includes(url.hostname.toLowerCase())) return href;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/bai-viet/")) {
    const slug = path.slice("/bai-viet/".length);
    return /^[a-z0-9-]{1,200}$/.test(slug) ? `${SITE_URL}/bai-viet/?bai=${slug}` : `${SITE_URL}/bai-viet/`;
  }
  const paths = {
    "/": "/", "/locketgold.app": "/",
    "/dich-vu-vip": "/len-gold/", "/bang-gia": "/len-gold/", "/kich-hoat": "/len-gold/",
    "/huong-dan": "/huong-dan/", "/lien-he": "/lien-he/",
    "/bai-viet": "/bai-viet/", "/tai-dns": "/tai-dns/",
  };
  return `${SITE_URL}${paths[path] || "/"}${path === "/bai-viet" ? url.search : ""}${url.hash}`;
}

export function postText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/(?:www\.)?locketgold\.app(?:\/[^\s<>"'\])}]*)?/gi, (match) => {
      const punctuation = match.match(/[.,;:!?]+$/)?.[0] || "";
      return postHref(punctuation ? match.slice(0, -punctuation.length) : match) + punctuation;
    })
    .replace(/(?:www\.)?locketgold\.app/gi, "locketgold.info")
    .replace(/(?:Trần\s+)?Quốc\s+Vũ/giu, "Locket Gold");
}

export function postForDisplay(post) {
  return { ...post, title: postText(post.title), excerpt: postText(post.excerpt), category: postText(post.category) };
}
