/**
 * 生成标签页标识与租约标识。
 * 每个标签页有独立 client_id；每次结算尝试生成独立 lease_id。
 */
export function generateClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "tab-" + crypto.randomUUID();
  }
  return "tab-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function generateLeaseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return "lease-" + crypto.randomUUID();
  }
  return "lease-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export const CLIENT_ID = generateClientId();
