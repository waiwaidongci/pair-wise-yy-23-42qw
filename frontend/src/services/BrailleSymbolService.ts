import { getAll, getById, openLedgerDb, putOne, STORE, withCacheEvictionOnQuota } from "../db/ledgerDb";
import { nextId } from "../db/ledgerInit";
import { createDefaultBrailleSymbol } from "../constructors/BrailleSymbolConstructor";
import type { BrailleSymbol } from "../types/BrailleSymbol";
import { log } from "../utils/logger";
import { wrapServiceError } from "./LedgerError";

export async function listBrailleSymbols(): Promise<BrailleSymbol[]> {
  const db = await openLedgerDb();
  const rows = await getAll<BrailleSymbol>(db, STORE.symbols);
  return rows.sort((a, b) => a.id - b.id);
}

export async function getBrailleSymbol(id: number): Promise<BrailleSymbol | undefined> {
  const db = await openLedgerDb();
  return getById<BrailleSymbol>(db, STORE.symbols, id);
}

/**
 * 老师保存卡片：内容变化时版本 +1。
 * 进行中的练习会话靠这个版本号判定未完成题目是否失效。
 */
export async function saveBrailleSymbol(input: Partial<BrailleSymbol> & Pick<BrailleSymbol, "letter" | "cell_pattern">): Promise<BrailleSymbol> {
  try {
    const db = await openLedgerDb();
    const existing = input.id ? await getById<BrailleSymbol>(db, STORE.symbols, input.id) : undefined;
    const now = new Date().toISOString();
    const base = existing ?? createDefaultBrailleSymbol({ id: await nextId(STORE.symbols), updated_at: now });
    const candidate: BrailleSymbol = { ...base, ...input, id: base.id };
    const contentChanged = existing
      ? existing.cell_pattern !== candidate.cell_pattern ||
        existing.letter !== candidate.letter ||
        existing.pinyin !== candidate.pinyin ||
        existing.category !== candidate.category ||
        existing.difficulty !== candidate.difficulty ||
        existing.audio_hint_key !== candidate.audio_hint_key
      : true;
    const saved: BrailleSymbol = {
      ...candidate,
      version: existing && contentChanged ? existing.version + 1 : base.version,
      updated_at: contentChanged ? now : base.updated_at
    };
    await withCacheEvictionOnQuota(db, [STORE.symbols], async (d) => {
      await putOne(d, STORE.symbols, saved);
    });
    log("BrailleSymbol", existing ? (contentChanged ? 1 : 2) : 0, {
      id: saved.id,
      letter: saved.letter,
      version: saved.version,
      oldVersion: existing?.version ?? 0,
      difficulty: saved.difficulty
    });
    return saved;
  } catch (error) {
    throw wrapServiceError(error);
  }
}
