// Keep the existing prefixes so pending QR codes remain payable.
export const paymentCodeRules = [
  { prefix: "LG", suffix_length: 8, purpose: "Thanh toán đơn Gold", example: "LG12345678" },
  { prefix: "LGNAP", suffix_length: 8, purpose: "Nạp ví CTV", example: "LGNAP12345678" },
];

export function extractPaymentCodes(payload) {
  const codes = new Set();
  for (const value of [payload.code, payload.content, payload.description]) {
    const text = String(value || "").toUpperCase();
    for (const match of text.matchAll(/(?:^|[^A-Z0-9])(LGNAP[A-Z0-9]{8}|LG[A-Z0-9]{8})(?![A-Z0-9])/g)) codes.add(match[1]);
  }
  return [...codes];
}
