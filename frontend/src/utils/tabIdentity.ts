/**
 * 标签页标识：两个标签页并发提交时区分胜负，后到页面保留现场。
 * sessionStorage 每个标签页独立，正合适。
 */
export function getTabId(): string {
  const key = "braille-trainer.tab-id";
  let id: string | null = null;
  try {
    id = sessionStorage.getItem(key);
    if (!id) {
      id = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(key, id);
    }
  } catch {
    id = `tab-anon-${Math.random().toString(36).slice(2, 8)}`;
  }
  return id;
}

/** 幂等键：同一会话同一道题（题目序号）全局唯一，并发只结算一笔 */
export function buildIdempotencyKey(sessionId: number, questionIndex: number): string {
  return `session:${sessionId}:question:${questionIndex}`;
}

/** 打乱题目顺序（失效重排后重新洗牌剩余题） */
export function shuffleOrder<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
