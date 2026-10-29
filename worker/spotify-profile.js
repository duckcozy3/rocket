import { load } from "cheerio/slim";
import { spotifyUid } from "../src/spotify.js";

export function parseSpotifyProfile(html, uid) {
  const $ = load(html);
  const canonical = $('link[rel="canonical"]').attr("href") || $('meta[property="og:url"]').attr("content");
  if (canonical && spotifyUid(canonical) !== uid) return null;
  const title = ($('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || "").replace(/\s*[|–-]\s*Spotify\s*$/i, "").trim();
  if (!title || /^(spotify|user profile|profile|spotify web player)$/i.test(title)) return null;
  const rawImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
  let avatar = null;
  try {
    const image = new URL(rawImage);
    if (image.protocol === "https:" && !image.username && !image.password && ["i.scdn.co", "image-cdn-ak.spotifycdn.com"].includes(image.hostname)) avatar = image.href;
  } catch { /* Missing public avatar. */ }
  return avatar ? { display_name: title.slice(0, 200), avatar } : null;
}

export async function lookupPublicSpotify(uid) {
  const profile_url = `https://open.spotify.com/user/${encodeURIComponent(uid)}`;
  const fallback = { success: true, uid, display_name: null, avatar: null, profile_url, lookup_status: "unavailable", source: "public_metadata" };
  try {
    const response = await fetch(profile_url, { headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" }, redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return fallback;
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); return fallback; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const profile = parseSpotifyProfile(new TextDecoder().decode(bytes), uid);
    return profile ? { ...fallback, ...profile, lookup_status: "found" } : fallback;
  } catch { return fallback; }
}
