export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  LEDGER_LOCK_HELD: "另一标签页正在结算，已保留你的作答现场",
  LEDGER_LOCK_EXPIRED: "会话锁已过期，请重新提交",
  LEDGER_ENTRY_NOT_FOUND: "未找到对应的账本操作记录",
  LEDGER_ENTRY_ALREADY_SETTLED: "该笔操作已结算，请勿重复提交",
  LEDGER_ENTRY_REVOKED: "该笔操作已撤账，题目已重排",
  SNAPSHOT_NOT_FOUND: "会话快照不存在，无法继续练习",
  SNAPSHOT_STALE: "卡片或课程已变更，未完成题目已失效重排",
  SESSION_NOT_ACTIVE: "会话未在进行中，无法提交答案",
  STORAGE_QUOTA_EXCEEDED: "本地存储空间不足，已清理可重建缓存",
  STORAGE_CLEAR_CACHE_FIRST: "空间不足，已优先清理缓存数据，课程与答题账本保留"
};
