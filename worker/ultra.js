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
  if (!env.NODNS_API_KEY) {
    console.error("Ultra activation needs review", order.code, "missing NODNS_API_KEY");
    return;
  }
  try {
    const { result } = await providerRequest(env, "/api/v1/ctv/gold", {
      method: "POST", apiKey: true, body: { user: order.username, isFilter: true, package: "filter_lifetime" },
    });
    const data = unwrap(result);
    const installUrl = ultraInstallUrl(data);
    const confirmed = result.success === true || result.status === "success" || (result.status === "info" && data.already_has_gold === true);
    if (!confirmed || data.active === false || data.isFilter === false || !installUrl || (data.package && data.package !== "filter_lifetime")) {
      console.error("Ultra activation needs review", order.code, "unconfirmed response", { status: result.status, hasInstallUrl: Boolean(installUrl), package: data.package });
      return;
    }
    // Completed means delivery of the personal installation link, not installation on the customer's device.
    await env.DB.prepare("UPDATE orders SET ultra_install_url = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE code = ? AND status = 'paid'").bind(installUrl, order.code).run();
  } catch (error) {
    console.error("Ultra activation needs review", order.code, error.status || "connection");
  }
}
