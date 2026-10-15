function utcDate(value) {
  if (!value) return null;
  const text = String(value).trim().replace(" ", "T");
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function orderCreatedLabel(value) {
  const date = utcDate(value);
  return date ? new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(date) : "—";
}

export function visibleAdminOrder(order, now = Date.now()) {
  if (order.expired_at || order.admin_deleted_at) return false;
  const deadline = utcDate(order.expires_at);
  return !(order.status === "pending" && deadline && deadline.getTime() <= now);
}
