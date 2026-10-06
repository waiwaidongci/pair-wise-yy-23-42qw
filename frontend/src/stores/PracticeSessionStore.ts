import { create } from "zustand";
import {
  listPracticeSession,
  recoverLedgerApi,
  reconcileSessionApi,
  startPracticeSessionApi,
  submitAnswerApi
} from "../api/PracticeSession";
import type { PracticeSession } from "../types/PracticeSession";
import type { SubmitAnswerInput, SubmitOutcome } from "../services/PracticeLedgerService";
import type { InvalidatedQuestion } from "../types/InvalidatedQuestion";
import { isLedgerError } from "../services/LedgerError";
import { getTabId } from "../utils/tabIdentity";

interface RecoveryInfo {
  committed: number;
  aborted: number;
  recoveredSessions: number[];
  at: string;
}

type State = {
  rows: PracticeSession[];
  loading: boolean;
  error: string | null;
  activeSession: PracticeSession | null;
  /** 后到页面保留现场：并发提交被拒时的胜出记录 */
  duplicateWinner: SubmitOutcome["winner"] | null;
  /** 最近一次失效重排的题目 */
  lastInvalidated: InvalidatedQuestion[];
  recovery: RecoveryInfo | null;
  tabId: string;

  load: () => Promise<void>;
  start: (lessonId: number, mode: PracticeSession["mode"]) => Promise<boolean>;
  openSession: (sessionId: number) => Promise<boolean>;
  submit: (input: Omit<SubmitAnswerInput, "sourceTab">) => Promise<SubmitOutcome | null>;
  reconcile: (sessionId: number) => Promise<void>;
  recover: () => Promise<void>;
  clearNotice: () => void;
};

export const usePracticeSessionStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  activeSession: null,
  duplicateWinner: null,
  lastInvalidated: [],
  recovery: null,
  tabId: getTabId(),

  async load() {
    set({ loading: true, error: null });
    try {
      set({ rows: await listPracticeSession(), loading: false });
    } catch (error) {
      set({ loading: false, error: isLedgerError(error) ? error.message : String(error) });
    }
  },

  async start(lessonId, mode) {
    set({ error: null, duplicateWinner: null, lastInvalidated: [] });
    try {
      const session = await startPracticeSessionApi({ lessonId, mode, ownerTab: get().tabId });
      set({ activeSession: session, rows: [session, ...get().rows] });
      return true;
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
      return false;
    }
  },

  async openSession(sessionId) {
    set({ error: null });
    try {
      // 进入半截会话时先做失效重排（老师可能已改课程/卡片）
      const result = await reconcileSessionApi(sessionId);
      set({
        activeSession: result.session,
        lastInvalidated: result.invalidated.length > 0 ? result.invalidated : get().lastInvalidated
      });
      await get().load();
      return true;
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
      return false;
    }
  },

  async submit(input) {
    set({ error: null, duplicateWinner: null });
    try {
      const outcome = await submitAnswerApi({ ...input, sourceTab: get().tabId });
      set({
        activeSession: outcome.session,
        duplicateWinner: outcome.status === "DUPLICATE_REJECTED" ? outcome.winner : null,
        lastInvalidated: outcome.invalidated.length > 0 ? outcome.invalidated : get().lastInvalidated
      });
      await get().load();
      return outcome;
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
      return null;
    }
  },

  async reconcile(sessionId) {
    try {
      const result = await reconcileSessionApi(sessionId);
      set({
        activeSession: result.session,
        lastInvalidated: result.invalidated.length > 0 ? result.invalidated : get().lastInvalidated
      });
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
    }
  },

  async recover() {
    try {
      const result = await recoverLedgerApi();
      if (result.committed > 0 || result.aborted > 0 || result.recoveredSessions.length > 0) {
        set({ recovery: { ...result, at: new Date().toISOString() } });
      }
      await get().load();
    } catch (error) {
      set({ error: isLedgerError(error) ? error.message : String(error) });
    }
  },

  clearNotice() {
    set({ duplicateWinner: null, lastInvalidated: [], error: null });
  }
}));
