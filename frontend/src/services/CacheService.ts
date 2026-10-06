import { getAll, openLedgerDb, putOne, STORE, tx, evictRebuildableCache, freeCacheIfLow } from "../db/ledgerDb";
import type { RebuildableCache } from "../types/RebuildableCache";
import { log } from "../utils/logger";

/**
 * 读可重建缓存；没有或指纹过期时用 builder 重建并写回。
 * 空间压力由 withCacheEvictionOnQuota 兜底：先清缓存再重试，账本永不因缓存被挤掉。
 */
export async function getRebuildableCache<T>(
  key: string,
  sourceFingerprint: string,
  builder: () => T | Promise<T>
): Promise<T> {
  const db = await openLedgerDb();
  const hit = await tx<RebuildableCache | undefined>(db, STORE.cache, "readonly", (t) =>
    t.objectStore(STORE.cache).get(key) as IDBRequest<RebuildableCache | undefined>
  );
  if (hit && hit.source_fingerprint === sourceFingerprint) return hit.value as T;

  const value = await builder();
  const entry: RebuildableCache = {
    key,
    value,
    rebuilt_at: new Date().toISOString(),
    source_fingerprint: sourceFingerprint
  };
  try {
    await putOne(db, STORE.cache, entry);
  } catch (error) {
    // 缓存写不进去绝不影响主流程：清空一次缓存后静默放弃
    if ((error as { name?: string })?.name === "QuotaExceededError") {
      await evictRebuildableCache(db);
      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        if (typeof usage === "number" && typeof quota === "number" && quota > 0) {
          log("Ledger", 1, { ratio: `${Math.round((usage / quota) * 100)}%`, bytes: 0 });
        }
      }
    }
  }
  return value;
}

export async function clearAllRebuildableCache(): Promise<number> {
  const db = await openLedgerDb();
  const rows = await getAll<RebuildableCache>(db, STORE.cache);
  await evictRebuildableCache(db);
  return rows.length;
}

/** 应用启动时的预防性清理：空间紧张先清缓存 */
export async function preemptiveCacheCleanup(): Promise<boolean> {
  return freeCacheIfLow(0.12);
}
