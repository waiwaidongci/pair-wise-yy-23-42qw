import { BrailleCell } from "./BrailleCell";
import type { SymbolSnapshot } from "../../types/PracticeSession";
import type { PracticeMode } from "../../types/PracticeMode";

/**
 * 练习面板：始终用会话冻结的快照渲染题目，
 * 老师当场改卡片也不会污染进行中的半截会话。
 */
export function PracticePanel({
  snapshot,
  mode,
  index,
  total
}: {
  snapshot: SymbolSnapshot;
  mode: PracticeMode;
  index: number;
  total: number;
}) {
  const showCell = mode === "CELL_TO_TEXT" || mode === "LISTENING" || mode === "MIXED";
  const showLetter = mode === "TEXT_TO_CELL";
  return (
    <div className="practice-panel">
      <div className="practice-panel-head">
        <span className="question-no">第 {index + 1} / {total} 题</span>
        <span className="question-mode">
          {mode === "CELL_TO_TEXT" ? "看点位，写字符" : mode === "TEXT_TO_CELL" ? "看字符，点点位" : mode === "LISTENING" ? "听音写字符" : "混合模式"}
        </span>
      </div>
      <div className="practice-question">
        {showCell ? <BrailleCell pattern={snapshot.cell_pattern} size={120} active /> : null}
        {showLetter ? <div className="big-letter">{snapshot.letter}</div> : null}
        {mode === "LISTENING" ? <div className="audio-hint">🔊 {snapshot.audio_hint_key}</div> : null}
      </div>
      <div className="practice-hint">本题依据开练冻结的 v{snapshot.version} 卡片判分</div>
    </div>
  );
}
