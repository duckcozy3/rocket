import { providerRequest, unwrap } from "./nodns.js";

export function ultraInstallUrl(data) {
  for (const value of [data?.mobileconfigUrl, data?.filterShortUrl]) {
    try {
      const url = new URL(value);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch {}
  }
  return null;
}

export async function activateUltraOrder(env, order) {
  if (order.plan_id !== "ios-ultra-lifetime" || order.platform !== "iOS") return;
  if (!env.ULTRA_NODNS_API_KEY) return;
  try {
    const { result } = await providerRequest({ ...env, NODNS_API_KEY: env.ULTRA_NODNS_API_KEY }, "/api/v1/ctv/gold", {
      method: "POST", apiKey: true, body: { user: order.username, packageId: "lifetime", isFilter: true },
    });
    const data = unwrap(result);
    const installUrl = ultraInstallUrl(data);
    if (!(result.success === true || result.status === "success") || data.active !== true || data.isFilter !== true || !installUrl || (data.packageId && data.packageId !== "lifetime")) return;
    // Completed means delivery of the personal installation link, not installation on the customer's device.
    await env.DB.prepare("UPDATE orders SET ultra_install_url = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'paid'").bind(installUrl, order.code).run();
  } catch (error) {
    console.error("Ultra activation needs review", order.code, error.status || "connection");
  }
}
