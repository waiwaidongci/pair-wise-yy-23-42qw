import { getRebuildableCache } from "./CacheService";
import { listAnswerRecords, listInvalidatedQuestions, listPracticeSessions } from "./PracticeLedgerService";
import { listBrailleSymbols } from "./BrailleSymbolService";
import { listLessons } from "./LessonService";
import { log } from "../utils/logger";

export interface ProgressStat {
  totalSessions: number;
  finishedSessions: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  mistakeReasons: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  invalidatedQuestions: number;
}

/**
 * 进度统计只认 SETTLED 账本记录；ROLLED_BACK / PENDING 一律不进统计。
 * 聚合结果是可重建缓存，账本指纹变化后自动重算。
 */
export async function buildProgressStat(): Promise<ProgressStat> {
  const [sessions, answers, symbols, lessons, invalidations] = await Promise.all([
    listPracticeSessions(),
    listAnswerRecords({ settledOnly: true }),
    listBrailleSymbols(),
    listLessons(),
    listInvalidatedQuestions()
  ]);
  const fingerprint = [
    `sessions=${sessions.length}:${sessions.reduce<string>((m, s) => (s.last_active_at > m ? s.last_active_at : m), "")}`,
    `answers=${answers.length}:${answers.reduce<string>((m, a) => ((a.settled_at ?? "") > m ? (a.settled_at ?? "") : m), "")}`,
    `symbols=${symbols.reduce((m, s) => m + s.version, 0)}`,
    `lessons=${lessons.reduce((m, l) => m + l.version, 0)}`,
    `invalidations=${invalidations.length}`
  ].join("|");

  return getRebuildableCache<ProgressStat>("stat:progress", fingerprint, () => {
    const mistakeReasons: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};
    for (const answer of answers) {
      if (!answer.correct) {
        mistakeReasons[answer.mistake_reason] = (mistakeReasons[answer.mistake_reason] ?? 0) + 1;
      }
      const difficulty = answer.symbol_snapshot?.difficulty ?? "?";
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] ?? 0) + 1;
    }
    const stat: ProgressStat = {
      totalSessions: sessions.length,
      finishedSessions: sessions.filter((s) => s.status === "FINISHED").length,
      totalAnswers: answers.length,
      correctAnswers: answers.filter((a) => a.correct).length,
      accuracy: answers.length === 0 ? 0 : Math.round((answers.filter((a) => a.correct).length / answers.length) * 100),
      mistakeReasons,
      difficultyDistribution,
      invalidatedQuestions: invalidations.length
    };
    log("AnswerRecord", 4, { count: answers.length });
    return stat;
  });
}
