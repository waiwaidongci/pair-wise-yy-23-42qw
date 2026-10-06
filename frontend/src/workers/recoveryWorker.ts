/**
 * 恢复 Worker：在后台执行崩溃恢复，补齐或撤掉未结算记录。
 * 避免阻塞主线程。
 */
import { recoverActiveSessions } from "../services/RecoveryService";

self.onmessage = async (event: MessageEvent<{ type: string }>) => {
  if (event.data?.type === "RECOVER") {
    try {
      const results = await recoverActiveSessions();
      (self as unknown as Worker).postMessage({ type: "RECOVER_DONE", results });
    } catch (err) {
      (self as unknown as Worker).postMessage({ type: "RECOVER_ERROR", error: String(err) });
    }
  }
};

export {};
