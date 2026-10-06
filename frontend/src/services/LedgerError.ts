import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/** 业务异常基类，service / controller 各自再包一层（见各 service 的 wrapXError） */
export class LedgerError extends Error {
  readonly code: ErrorCode;
  readonly causeDetail?: unknown;

  constructor(code: ErrorCode, detail?: unknown, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "LedgerError";
    this.code = code;
    this.causeDetail = detail;
  }
}

export function isLedgerError(error: unknown): error is LedgerError {
  return error instanceof LedgerError;
}

/** service 层包装：底层异常 -> 账本业务异常 */
export function wrapServiceError(error: unknown): LedgerError {
  if (isLedgerError(error)) return error;
  if (typeof error === "object" && error !== null && (error as { name?: string }).name === "QuotaExceededError") {
    return new LedgerError(ERROR_CODES.QUOTA_EXCEEDED, error);
  }
  return new LedgerError(ERROR_CODES.LEDGER_NOT_READY, error);
}

/** controller（store/页面动作）层再包一层，错误消息带上动作语义 */
export function wrapControllerError(error: unknown, action: string): LedgerError {
  const base = wrapServiceError(error);
  const wrapped = new LedgerError(base.code, base.causeDetail, `${action}失败：${base.message}`);
  wrapped.name = "ControllerError";
  return wrapped;
}
