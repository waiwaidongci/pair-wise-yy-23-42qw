import { getAll, openLedgerDb, putOne, STORE, txAll } from "./ledgerDb";
import { seedBrailleSymbols, seedLessons } from "../mocks/seedData";
import { log } from "../utils/logger";

let ready: Promise<void> | null = null;

/** 测试辅助：重置初始化单例（删库后需重新播种） */
export function __resetLedgerInit(): void {
  ready = null;
}

/** 首次打开时把种子写进账本；已有数据则不动 */
export function initLedger(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    const db = await openLedgerDb();
    const existing = await getAll(db, STORE.symbols);
    if (existing.length === 0) {
      await txAll(db, [STORE.symbols, STORE.lessons], "readwrite", (t) => {
        for (const symbol of seedBrailleSymbols) t.objectStore(STORE.symbols).put(symbol);
        for (const lesson of seedLessons) t.objectStore(STORE.lessons).put(lesson);
      });
      log("Ledger", 0, { symbols: seedBrailleSymbols.length, lessons: seedLessons.length });
    }
  })();
  return ready;
}

export async function nextId(storeName: string): Promise<number> {
  const db = await openLedgerDb();
  const rows = await getAll<{ id?: number }>(db, storeName);
  return rows.reduce((max, row) => Math.max(max, typeof row.id === "number" ? row.id : 0), 0) + 1;
}

export { putOne };
