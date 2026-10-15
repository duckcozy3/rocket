import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { adminRevenue } from "../worker/admin-revenue.js";

test("revenue counts paid orders after discounts, including hidden orders, in Vietnam time", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE orders (amount INTEGER, status TEXT, paid_at TEXT, completed_at TEXT, created_at TEXT, admin_deleted_at TEXT)");
    const now = new Date();
    const vietnamDate = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
    const start = new Date(`${vietnamDate}T00:00:00+07:00`).getTime();
    const insert = db.prepare("INSERT INTO orders VALUES (?, ?, ?, NULL, ?, ?)");
    insert.run(80000, "paid", new Date(start).toISOString(), "2020-01-01", null);
    insert.run(50000, "completed", new Date(start + 1000).toISOString(), "2020-01-01", "2026-01-01");
    insert.run(10000, "paid", new Date(start - 1000).toISOString(), "2020-01-01", null);
    insert.run(999999, "pending", new Date(start).toISOString(), "2020-01-01", null);
    insert.run(999999, "failed", new Date(start).toISOString(), "2020-01-01", null);
    const env = { DB: { prepare(sql) { return { async all() { return { results: db.prepare(sql).all() }; } }; } } };
    const rows = await adminRevenue(env);
    assert.deepEqual({ ...rows.find((row) => row.period === "today") }, { period: "today", orders: 2, amount: 130000 });
    assert.deepEqual({ ...rows.find((row) => row.period === "total") }, { period: "total", orders: 3, amount: 140000 });
    const month = rows.find((row) => row.period === "month");
    assert.equal(month.amount, vietnamDate.endsWith("-01") ? 130000 : 140000);
    db.exec("DELETE FROM orders");
    assert.ok((await adminRevenue(env)).every((row) => row.orders === 0 && row.amount === 0));
  } finally { db.close(); }
});

test("revenue handles an unconfigured database", async () => {
  assert.deepEqual(await adminRevenue({}), []);
});
