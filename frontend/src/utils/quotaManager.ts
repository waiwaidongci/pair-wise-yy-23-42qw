import { clearRebuildableCache } from "./ledgerDb";

/**
 * 判断是否为存储配额超限错误。
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014;
  }
  if (err instanceof Error) {
    return /quota|exceeded|storage/i.test(err.message);
  }
  return false;
}

/**
 * 空间不足处理：先清可重建缓存（快照），课程与答题账本保留。
 * 返回是否清理了缓存。
 */
export async function handleQuotaExceeded(): Promise<boolean> {
  const cleared = await clearRebuildableCache();
  return cleared > 0;
}

/**
 * 带配额保护的写入：先尝试写入，配额超限时清缓存后重试一次。
 */
export async function withQuotaGuard<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (isQuotaExceededError(err)) {
      const cleared = await handleQuotaExceeded();
      if (cleared) {
        return await write();
      }
    }
    throw err;
  }
}
