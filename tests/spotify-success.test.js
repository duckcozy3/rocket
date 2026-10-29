import test from "node:test";
import assert from "node:assert/strict";
import { spotifySuccess } from "../src/spotify-success.js";

test("Spotify purchase confirmation distinguishes payment from activation and includes installation steps", () => {
  const esc = value => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const order = { username: "<alice>", code: "LG12345678", plan_name: "Spotify 3 tháng", status: "paid" };
  const pending = spotifySuccess(order, esc);
  assert.match(pending, /Đã mua thành công/);
  assert.match(pending, /Đang kích hoạt Spotify Premium/);
  assert.ok(!pending.includes("<alice>"));
  assert.match(pending, /spotify-mitm\.mobileconfig/);
  assert.match(pending, /Bật tin cậy chứng chỉ/);
  const completed = spotifySuccess({ ...order, status: "completed" }, esc);
  assert.match(completed, /Spotify Premium đã được kích hoạt/);
  assert.ok(!completed.includes("Đang kích hoạt Spotify Premium"));
});
