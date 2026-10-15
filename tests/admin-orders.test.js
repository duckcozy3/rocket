import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";
import { orderCreatedLabel, visibleAdminOrder } from "../src/admin-orders.js";

test("order dates interpret D1 timestamps as UTC and display Vietnam time", () => {
  assert.equal(orderCreatedLabel("2026-10-15 11:21:35"), orderCreatedLabel("2026-10-15T11:21:35Z"));
  assert.match(orderCreatedLabel("2026-10-15 11:21:35"), /18:21:35/);
  assert.equal(orderCreatedLabel(null), "—");
});

test("expired and deleted orders disappear without hiding paid orders past their payment deadline", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  assert.equal(visibleAdminOrder({ status: "pending", expires_at: "2026-10-15T12:00:00Z" }, now), false);
  assert.equal(visibleAdminOrder({ status: "pending", expires_at: "2026-10-15T12:01:00Z" }, now), true);
  assert.equal(visibleAdminOrder({ status: "completed", expires_at: "2026-10-15T11:00:00Z" }, now), true);
  assert.equal(visibleAdminOrder({ expired_at: "2026-10-15 11:00:00" }, now), false);
  assert.equal(visibleAdminOrder({ admin_deleted_at: "2026-10-15 11:00:00" }, now), false);
});

test("admin order deletion requires a valid admin session and same origin, and preserves the order record", async () => {
  let deleted = false;
  const queries = [];
  const env = { SESSION_SECRET: "orders-test-secret", ADMIN_PASSWORD_SHA256: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", DB: {
    prepare(sql) { queries.push(sql); return {
      bind(...args) { this.args = args; return this; },
      async run() {
        if (sql.includes("admin_deleted_at =")) {
          assert.deepEqual(this.args, ["LGABCDEFGH"]);
          const changes = deleted ? 0 : 1; deleted = true;
          return { meta: { changes } };
        }
        return { meta: { changes: 0 } };
      },
      async all() { return { results: [] }; },
    }; },
  } };
  const site = "https://locketgold.info";
  const call = (cookie = "", origin = site) => worker.fetch(new Request(`${site}/api/admin/orders/LGABCDEFGH`, {
    method: "DELETE", headers: { Cookie: cookie, Origin: origin },
  }), env, {});
  assert.equal((await call()).status, 401);
  const login = await worker.fetch(new Request(`${site}/api/admin/login`, {
    method: "POST", headers: { Origin: site, "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  }), env, {});
  assert.equal(login.status, 200);
  const cookie = login.headers.get("Set-Cookie").split(";")[0];
  assert.equal((await call(cookie, "https://other.example")).status, 403);
  assert.equal(deleted, false);
  assert.equal((await call(cookie)).status, 200);
  assert.equal((await call(cookie)).status, 404);
  const listed = await worker.fetch(new Request(`${site}/api/admin/orders`, { headers: { Cookie: cookie } }), env, {});
  assert.equal(listed.status, 200);
  assert.ok(queries.some((sql) => /WHERE expired_at IS NULL AND admin_deleted_at IS NULL.*LIMIT 100/.test(sql)));
  assert.ok(!queries.some((sql) => /^DELETE FROM/.test(sql)));
});
