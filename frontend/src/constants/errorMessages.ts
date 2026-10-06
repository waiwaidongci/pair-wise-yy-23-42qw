import { ERROR_CODES } from "./errorCodes";

export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  LEDGER_NOT_READY: "账本尚未初始化完成，请稍后重试",
  SESSION_NOT_FOUND: "练习会话不存在或已丢失",
  SESSION_NOT_RUNNING: "该会话已结算或已终止，不能继续答题",
  QUESTION_NOT_PENDING: "当前题目不在待答队列，可能已被失效重排",
  DUPLICATE_SUBMISSION: "同一道题只允许结算一笔，后到的提交已保留现场",
  SNAPSHOT_INVALIDATED: "课程或卡片已改版，未完成题目已失效并重新排队",
  QUOTA_EXCEEDED: "存储空间不足：已清空可重建缓存，请重试（课程与答题账本不会删除）",
  RECOVERY_ABORT: "崩溃残留记录缺少提交现场，已撤掉"
} as const satisfies Record<keyof typeof ERROR_CODES, string>;
