import assert from "node:assert/strict";
import test from "node:test";
import { promoPlanTypes, assertPromoPlan } from "../src/promo-plans.js";

test("promo eligibility separates monthly, annual and lifetime plans", () => {
  for (const [type, ids] of Object.entries({ month: ["ios-month", "spotify-1month", "spotify-3month", "spotify-6month"], year: ["ios-year", "spotify-12month"], lifetime: ["ios-lifetime", "ios-ultra-lifetime", "android-lifetime"] })) {
    for (const id of ids) {
      assert.doesNotThrow(() => assertPromoPlan({ plan_types: JSON.stringify([type]) }, { id }));
      for (const other of Object.keys({ month: 1, year: 1, lifetime: 1 }).filter(value => value !== type)) {
        assert.throws(() => assertPromoPlan({ plan_types: JSON.stringify([other]) }, { id }), { status: 400 });
      }
      assert.doesNotThrow(() => assertPromoPlan({ plan_types: null }, { id }));
    }
  }
});

test("promo selections require a nonempty valid list and support multiple types", () => {
  for (const value of [[], ["unknown"], "{}", 1]) assert.throws(() => promoPlanTypes(value), { status: 400 });
  assert.deepEqual(promoPlanTypes(["month", "year", "month"]), ["month", "year"]);
  assert.deepEqual(promoPlanTypes(null), ["month", "year", "lifetime"]);
});
