import type { BrailleSymbol } from "../types/BrailleSymbol";
import { listBrailleSymbols, saveBrailleSymbol } from "../services/BrailleSymbolService";
import { wrapControllerError } from "../services/LedgerError";
import { log } from "../utils/logger";

const endpoint = "/api/braille-symbol";

/** 本地模拟 API：实际落到 IndexedDB 账本；保留 endpoint 以便将来切换真实后端 */
export async function listBrailleSymbol(): Promise<BrailleSymbol[]> {
  void endpoint;
  try {
    return await listBrailleSymbols();
  } catch (error) {
    throw wrapControllerError(error, "加载点字卡片");
  }
}

export async function saveBrailleSymbolApi(payload: Partial<BrailleSymbol> & Pick<BrailleSymbol, "letter" | "cell_pattern">): Promise<BrailleSymbol> {
  try {
    return await saveBrailleSymbol(payload);
  } catch (error) {
    throw wrapControllerError(error, "保存点字卡片");
  }
}

export async function exportBrailleSymbol(): Promise<BrailleSymbol[]> {
  const rows = await listBrailleSymbol();
  log("BrailleSymbol", 3, { count: rows.length });
  return rows;
}
