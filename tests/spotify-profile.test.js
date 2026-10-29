import test from "node:test";
import assert from "node:assert/strict";
import { parseSpotifyProfile, lookupPublicSpotify } from "../worker/spotify-profile.js";

test("profile metadata decodes HTML and verifies the canonical user", () => {
  const html = `<link href="https://open.spotify.com/user/alice" rel="canonical"><meta content="Alice &amp; Bob | Spotify" property="og:title"><meta property="og:image" content="https://i.scdn.co/image/avatar">`;
  assert.deepEqual(parseSpotifyProfile(html, "alice"), { display_name: "Alice & Bob", avatar: "https://i.scdn.co/image/avatar" });
  assert.equal(parseSpotifyProfile(html, "someone-else"), null);
  assert.equal(parseSpotifyProfile(html.replace("Alice &amp; Bob | Spotify", "Spotify"), "alice"), null);
  assert.equal(parseSpotifyProfile(html.replace("https://i.scdn.co/image/avatar", "https://example.com/avatar"), "alice"), null);
});

test("unavailable metadata still returns the UID without inventing a name or avatar", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 403 }));
  const result = await lookupPublicSpotify("alice");
  assert.equal(result.uid, "alice");
  assert.equal(result.lookup_status, "unavailable");
  assert.equal(result.display_name, null);
  assert.equal(result.avatar, null);
});
