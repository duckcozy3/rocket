import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { adminRevenue } from "../worker/admin-revenue.js";

test("revenue counts only visible paid orders after discounts, in Vietnam time", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE orders (amount INTEGER, status TEXT, paid_at TEXT, completed_at TEXT, created_at TEXT, admin_deleted_at TEXT, code TEXT, expired_at TEXT); CREATE TABLE settings (key TEXT)");
    const now = new Date();
    const vietnamDate = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const start = new Date(`${vietnamDate}T00:00:00+07:00`).getTime();
    const insert = db.prepare("INSERT INTO orders (amount, status, paid_at, completed_at, created_at, admin_deleted_at) VALUES (?, ?, ?, NULL, ?, ?)");
    insert.run(80000, "paid", new Date(start).toISOString(), "2020-01-01", null);
    insert.run(50000, "completed", new Date(start + 1000).toISOString(), "2020-01-01", "2026-01-01");
    insert.run(10000, "paid", new Date(start - 1000).toISOString(), "2020-01-01", null);
    insert.run(999999, "pending", new Date(start).toISOString(), "2020-01-01", null);
    insert.run(999999, "failed", new Date(start).toISOString(), "2020-01-01", null);
    const env = { DB: { prepare(sql) { return { async all() { return { results: db.prepare(sql).all() }; } }; } } };
    const rows = await adminRevenue(env);
    assert.deepEqual({ ...rows.find((row) => row.period === "today") }, { period: "today", orders: 1, amount: 80000 });
    assert.deepEqual({ ...rows.find((row) => row.period === "total") }, { period: "total", orders: 2, amount: 90000 });
    const month = rows.find((row) => row.period === "month");
    assert.equal(month.amount, vietnamDate.endsWith("-01") ? 80000 : 90000);
    db.exec("DELETE FROM orders");
    assert.ok((await adminRevenue(env)).every((row) => row.orders === 0 && row.amount === 0));
  } finally { db.close(); }
});

for (const migrated of [false, true]) {
  test(`monthly revenue uses Vietnam month boundaries and excludes hidden/expired orders (migration: ${migrated})`, async () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`CREATE TABLE orders (code TEXT, amount INTEGER, status TEXT, paid_at TEXT, completed_at TEXT, created_at TEXT, expired_at TEXT${migrated ? ', admin_deleted_at TEXT' : ''}); CREATE TABLE settings (key TEXT)`);
      const insert = db.prepare("INSERT INTO orders (code, amount, status, paid_at, expired_at) VALUES (?, ?, ?, ?, ?)");
      insert.run("before", 10000, "paid", "2025-01-31T16:59:59Z", null);
      insert.run("after", 20000, "completed", "2025-01-31T17:00:00Z", null);
      insert.run("hidden", 90000, "paid", "2025-01-31T17:00:00Z", null);
      insert.run("expired", 90000, "paid", "2025-01-31T17:00:00Z", "2025-02-01");
      db.exec("INSERT INTO settings VALUES ('admin_deleted_order:hidden')");
      if (migrated) {
        insert.run("deleted", 90000, "paid", "2025-01-31T17:00:00Z", null);
        db.exec("UPDATE orders SET admin_deleted_at = '2025-02-01' WHERE code = 'deleted'");
      }
      const env = { DB: { prepare(sql) { return { async all() { return { results: db.prepare(sql).all() }; } }; } } };
      const rows = await adminRevenue(env);
      assert.deepEqual({ ...rows.find((row) => row.period === "month:2025-01") }, { period: "month:2025-01", orders: 1, amount: 10000 });
      assert.deepEqual({ ...rows.find((row) => row.period === "month:2025-02") }, { period: "month:2025-02", orders: 1, amount: 20000 });
      assert.equal(rows.find((row) => row.period === "total").amount, 30000);
    } finally { db.close(); }
  });
}

test("revenue handles an unconfigured database", async () => {
  assert.deepEqual(await adminRevenue({}), []);
});
