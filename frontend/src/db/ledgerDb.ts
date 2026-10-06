/**
 * IndexedDB 账本底座。
 *
 * 库内对象仓库分两类：
 *  - 账本（必须留下）：braille_symbols / lessons / practice_sessions /
 *    answer_records / answer_op_logs / invalidated_questions
 *  - 可重建缓存（空间不足时先清）：cache
 */

export const STORE = {
  symbols: "braille_symbols",
  lessons: "lessons",
  sessions: "practice_sessions",
  answers: "answer_records",
  opLog: "answer_op_logs",
  invalidations: "invalidated_questions",
  cache: "cache"
} as const;

const DB_NAME = "braille-trainer-ledger";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/** 测试辅助：关闭连接并删除数据库后重置连接单例 */
export async function __closeDbConnection(): Promise<void> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}

/** 测试辅助：删除数据库后重置连接单例 */
export function __resetDbConnection(): void {
  dbPromise = null;
}

export function openLedgerDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE.symbols)) {
        db.createObjectStore(STORE.symbols, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.lessons)) {
        db.createObjectStore(STORE.lessons, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.sessions)) {
        const sessions = db.createObjectStore(STORE.sessions, { keyPath: "id" });
        sessions.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.answers)) {
        const answers = db.createObjectStore(STORE.answers, { keyPath: "id" });
        answers.createIndex("session_id", "session_id", { unique: false });
        answers.createIndex("op_seq", "op_seq", { unique: false });
        answers.createIndex("status", "status", { unique: false });
        // 幂等键唯一索引：同一会话的同一道题物理上只允许一笔结算
        answers.createIndex("idempotency_key", "idempotency_key", { unique: true });
      }
      if (!db.objectStoreNames.contains(STORE.opLog)) {
        const opLog = db.createObjectStore(STORE.opLog, { keyPath: "seq", autoIncrement: true });
        opLog.createIndex("status", "status", { unique: false });
        opLog.createIndex("session_id", "session_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.invalidations)) {
        const invalidations = db.createObjectStore(STORE.invalidations, { keyPath: "id", autoIncrement: true });
        invalidations.createIndex("session_id", "session_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.cache)) {
        db.createObjectStore(STORE.cache, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("ledger db upgrade blocked by another tab"));
  });
  return dbPromise;
}

export function tx<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = run(t);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
  });
}

/** 不关心返回值的多请求事务，等事务整体 commit/abort */
export function txAll(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    run(t);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("transaction aborted"));
  });
}

export async function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return tx<T[]>(db, storeName, "readonly", (t) => t.objectStore(storeName).getAll() as IDBRequest<T[]>);
}

export async function getById<T>(db: IDBDatabase, storeName: string, id: number | string): Promise<T | undefined> {
  return tx<T | undefined>(db, storeName, "readonly", (t) =>
    t.objectStore(storeName).get(id) as unknown as IDBRequest<T | undefined>
  );
}

export async function putOne(db: IDBDatabase, storeName: string, value: unknown): Promise<void> {
  await tx(db, storeName, "readwrite", (t) => t.objectStore(storeName).put(value));
}

export async function deleteOne(db: IDBDatabase, storeName: string, id: number | string): Promise<void> {
  await tx(db, storeName, "readwrite", (t) => t.objectStore(storeName).delete(id));
}

export async function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  await tx(db, storeName, "readwrite", (t) => t.objectStore(storeName).clear());
}

/** 清空全部可重建缓存。账本仓库一律不碰。 */
export async function evictRebuildableCache(db: IDBDatabase): Promise<void> {
  await clearStore(db, STORE.cache);
}

/**
 * 写操作包装：空间不足时先清可重建缓存再整体重试一次；
 * 账本写入优先，绝不把配额压力转嫁到课程/答题账本。
 */
export async function withCacheEvictionOnQuota<T>(
  db: IDBDatabase,
  stores: string[],
  run: (d: IDBDatabase) => Promise<T>
): Promise<T> {
  try {
    return await run(db);
  } catch (error) {
    if (isQuotaError(error)) {
      // 清缓存是独立事务，先落盘，再重试原本的账本写入
      if (!stores.includes(STORE.cache)) {
        await evictRebuildableCache(db);
      }
      return await run(db);
    }
    throw error;
  }
}

export function isQuotaError(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { name?: string }).name === "QuotaExceededError";
}

/** 剩余空间比例低于阈值时，预防性清空可重建缓存 */
export async function freeCacheIfLow(threshold = 0.12): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return false;
  const { usage, quota } = await navigator.storage.estimate();
  if (typeof usage !== "number" || typeof quota !== "number" || quota === 0) return false;
  if ((quota - usage) / quota > threshold) return false;
  const db = await openLedgerDb();
  await evictRebuildableCache(db);
  return true;
}
