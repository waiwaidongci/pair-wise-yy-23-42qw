import type { Lesson } from "../types/Lesson";
import type { BrailleSymbol } from "../types/BrailleSymbol";

/**
 * 计算课程+卡片快照的版本哈希。
 * 任意卡片或课程字段变化都会导致哈希变化，从而触发未完成题目失效重排。
 */
export async function computeSnapshotHash(
  lesson: Lesson,
  symbols: BrailleSymbol[]
): Promise<string> {
  const payload = JSON.stringify({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      symbol_ids: lesson.symbol_ids,
      stage: lesson.stage,
      estimated_minutes: lesson.estimated_minutes,
      unlock_rule: lesson.unlock_rule
    },
    symbols: symbols.map((s) => ({
      id: s.id,
      cell_pattern: s.cell_pattern,
      letter: s.letter,
      pinyin: s.pinyin,
      category: s.category,
      difficulty: s.difficulty,
      audio_hint_key: s.audio_hint_key
    }))
  });
  // 优先使用 SubtleCrypto，降级到简单哈希
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return "h" + (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * 比较两个版本哈希是否一致。
 */
export function isSnapshotStale(currentHash: string, frozenHash: string): boolean {
  return currentHash !== frozenHash;
}
