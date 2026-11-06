export const PROMO_PLAN_TYPES = { month: "Tháng", year: "Năm", lifetime: "Vĩnh viễn" };

export function promoPlanTypes(value) {
  if (value == null) return Object.keys(PROMO_PLAN_TYPES);
  const types = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(types) || !types.length || types.some(type => !Object.hasOwn(PROMO_PLAN_TYPES, type))) {
    throw Object.assign(new Error("Chọn ít nhất một loại gói hợp lệ để áp dụng mã."), { status: 400, publicMessage: "Chọn ít nhất một loại gói hợp lệ để áp dụng mã." });
  }
  return [...new Set(types)];
}

export function assertPromoPlan(promo, plan) {
  if (!promo) return;
  const id = plan.id;
  const type = id.endsWith("lifetime") ? "lifetime" : id.endsWith("year") || id === "spotify-12month" ? "year" : id.endsWith("month") ? "month" : null;
  if (promo.plan_types != null && !promoPlanTypes(promo.plan_types).includes(type)) {
    throw Object.assign(new Error("Mã giảm giá không áp dụng cho gói đã chọn."), { status: 400, publicMessage: "Mã giảm giá không áp dụng cho gói đã chọn." });
  }
}
