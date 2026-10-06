/**
 * 账本数据库（IndexedDB）
 *
 * 核心设计：
 * - ledger_entries 是只追加（append-only）的操作日志，op_id 自增，全局单调。
 * - sessions / answer_records / lessons / symbols 是账本，必须保留。
 * - snapshots 是可重建缓存，空间不足时优先清理。
 * - session_locks 提供跨标签页的原子租约，保证并发只结算一笔。
 */

const DB_NAME = "braille-trainer-ledger";
const DB_VERSION = 1;

export const STORES = {
  LEDGER_ENTRIES: "ledger_entries",
  SESSIONS: "sessions",
  ANSWER_RECORDS: "answer_records",
  LESSONS: "lessons",
  SYMBOLS: "symbols",
  SNAPSHOTS: "snapshots",
  SESSION_LOCKS: "session_locks",
  META: "meta"
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB 不可用"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // 账本操作日志：op_id 自增，全局单调
      if (!db.objectStoreNames.contains(STORES.LEDGER_ENTRIES)) {
        const s = db.createObjectStore(STORES.LEDGER_ENTRIES, {
          keyPath: "op_id",
          autoIncrement: true
        });
        s.createIndex("session_id", "session_id", { unique: false });
        s.createIndex("status", "status", { unique: false });
        s.createIndex("client_id", "client_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const s = db.createObjectStore(STORES.SESSIONS, { keyPath: "id", autoIncrement: true });
        s.createIndex("lesson_id", "lesson_id", { unique: false });
        s.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.ANSWER_RECORDS)) {
        const s = db.createObjectStore(STORES.ANSWER_RECORDS, { keyPath: "id", autoIncrement: true });
        s.createIndex("session_id", "session_id", { unique: false });
        s.createIndex("symbol_id", "symbol_id", { unique: false });
        s.createIndex("op_id", "op_id", { unique: true });
      }
      if (!db.objectStoreNames.contains(STORES.LESSONS)) {
        db.createObjectStore(STORES.LESSONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.SYMBOLS)) {
        db.createObjectStore(STORES.SYMBOLS, { keyPath: "id" });
      }
      // 可重建缓存：冻结快照
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
        db.createObjectStore(STORES.SNAPSHOTS, { keyPath: "session_id" });
      }
      // 跨标签页锁
      if (!db.objectStoreNames.contains(STORES.SESSION_LOCKS)) {
        db.createObjectStore(STORES.SESSION_LOCKS, { keyPath: "session_id" });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function withTransaction<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (stores: Record<string, IDBObjectStore>, tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode);
    const stores: Record<string, IDBObjectStore> = {};
    for (const name of names) stores[name] = tx.objectStore(name);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    Promise.resolve(fn(stores, tx))
      .then((r) => {
        result = r;
      })
      .catch((err) => {
        try {
          tx.abort();
        } catch {
          /* noop */
        }
        reject(err);
      });
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  return withTransaction(storeName, "readonly", async (stores) => {
    return reqToPromise<T[]>(stores[storeName].getAll() as IDBRequest<T[]>);
  });
}

export async function getByKey<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withTransaction(storeName, "readonly", async (stores) => {
    return reqToPromise<T | undefined>(stores[storeName].get(key) as IDBRequest<T | undefined>);
  });
}

/**
 * 判断是否为存储配额超限错误。
 */
function isQuotaExceeded(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014;
  }
  if (err instanceof Error) {
    return /quota|exceeded|storage/i.test(err.message);
  }
  return false;
}

export async function put<T>(storeName: StoreName, value: T): Promise<void> {
  try {
    await withTransaction(storeName, "readwrite", async (stores) => {
      stores[storeName].put(value);
    });
  } catch (err) {
    if (isQuotaExceeded(err)) {
      await clearRebuildableCache();
      await withTransaction(storeName, "readwrite", async (stores) => {
        stores[storeName].put(value);
      });
    } else {
      throw err;
    }
  }
}

export async function add<T>(storeName: StoreName, value: T): Promise<IDBValidKey> {
  try {
    return await withTransaction(storeName, "readwrite", async (stores) => {
      return reqToPromise<IDBValidKey>(stores[storeName].add(value));
    });
  } catch (err) {
    if (isQuotaExceeded(err)) {
      await clearRebuildableCache();
      return await withTransaction(storeName, "readwrite", async (stores) => {
        return reqToPromise<IDBValidKey>(stores[storeName].add(value));
      });
    }
    throw err;
  }
}

export async function deleteByKey(storeName: StoreName, key: IDBValidKey): Promise<void> {
  return withTransaction(storeName, "readwrite", async (stores) => {
    stores[storeName].delete(key);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  return withTransaction(storeName, "readwrite", async (stores) => {
    stores[storeName].clear();
  });
}

export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  return withTransaction(storeName, "readonly", async (stores) => {
    const index = stores[storeName].index(indexName);
    return reqToPromise<T[]>(index.getAll(value) as IDBRequest<T[]>);
  });
}

/**
 * 原子获取会话锁（租约）。
 * 仅当锁不存在或已过期时才获取成功，保证并发只结算一笔。
 */
export async function acquireSessionLock(
  sessionId: number,
  leaseId: string,
  ttlMs: number
): Promise<boolean> {
  return withTransaction(STORES.SESSION_LOCKS, "readwrite", async (stores) => {
    const store = stores[STORES.SESSION_LOCKS];
    const existing = await reqToPromise<{ expires_at: string } | undefined>(
      store.get(sessionId) as IDBRequest<{ expires_at: string } | undefined>
    );
    const now = Date.now();
    if (existing && new Date(existing.expires_at).getTime() > now) {
      return false; // 锁仍有效，抢占失败
    }
    const lock = {
      session_id: sessionId,
      lease_id: leaseId,
      acquired_at: new Date(now).toISOString(),
      expires_at: new Date(now + ttlMs).toISOString()
    };
    store.put(lock);
    return true;
  });
}

/**
 * 释放会话锁（仅持有者可释放）。
 */
export async function releaseSessionLock(sessionId: number, leaseId: string): Promise<void> {
  return withTransaction(STORES.SESSION_LOCKS, "readwrite", async (stores) => {
    const store = stores[STORES.SESSION_LOCKS];
    const existing = await reqToPromise<{ lease_id: string } | undefined>(
      store.get(sessionId) as IDBRequest<{ lease_id: string } | undefined>
    );
    if (existing && existing.lease_id === leaseId) {
      store.delete(sessionId);
    }
  });
}

/**
 * 在锁保护下执行结算；若抢占失败则返回 null，由调用方保留现场。
 */
export async function withSessionLock<T>(
  sessionId: number,
  leaseId: string,
  ttlMs: number,
  fn: () => Promise<T> | T
): Promise<T | null> {
  const acquired = await acquireSessionLock(sessionId, leaseId, ttlMs);
  if (!acquired) return null;
  try {
    return await fn();
  } finally {
    await releaseSessionLock(sessionId, leaseId);
  }
}

/**
 * 追加账本操作（写操作号）。op_id 由 IndexedDB 自增，全局单调。
 */
export async function appendLedgerEntry(
  entry: Omit<import("../types/LedgerEntry").LedgerEntry, "op_id">
): Promise<import("../types/LedgerEntry").LedgerEntry> {
  const opId = await add(STORES.LEDGER_ENTRIES, entry);
  return { ...entry, op_id: opId as number };
}

/**
 * 清理可重建缓存（快照），保留课程与答题账本。
 * 返回清理所释放的估算条目数。
 */
export async function clearRebuildableCache(): Promise<number> {
  const snapshots = await getAll<unknown>(STORES.SNAPSHOTS);
  await clearStore(STORES.SNAPSHOTS);
  return snapshots.length;
}

export { openDb };
