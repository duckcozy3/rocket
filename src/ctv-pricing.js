export const CTV_CREDITS = Object.freeze({ "ios-month": 1, "ios-year": 1, "ios-lifetime": 2 });
export function ctvCredits(planId) { return CTV_CREDITS[planId] || 0; }
export function ctvUnitPrice(prices, defaultPrice) {
  // Preserve the old one-month price as the unit price until admin sets a new price.
  return prices.unit_price ?? prices["ios-month"] ?? Number(defaultPrice);
}
