/**
 * 日志模板集中地：每个实体至少 4 条，所有写操作都经 logger 记录。
 * 字段变更时必须同步改这里和调用处（service/controller/store）。
 * 占位符使用 {name} 形式，由 logger.format 填充。
 */
export const LOG_TEMPLATES = {
  BrailleSymbol: [
    "点字卡片创建：id={id} letter={letter} version={version}",
    "点字卡片更新：id={id} version {oldVersion}->{version}",
    "点字卡片状态变更：id={id} difficulty={difficulty}",
    "点字卡片导出：共 {count} 张"
  ],
  Lesson: [
    "课程创建：id={id} title={title} version={version}",
    "课程更新：id={id} version {oldVersion}->{version} symbol_ids={symbolIds}",
    "课程状态变更：id={id} stage={stage}",
    "课程导出：共 {count} 门"
  ],
  PracticeSession: [
    "练习会话创建（冻结快照）：session={sessionId} lesson={lessonId} mode={mode} tab={tab}",
    "练习会话更新：session={sessionId} status={status} answered={answered}",
    "练习会话恢复：session={sessionId} 补齐操作={committed} 撤掉操作={aborted}",
    "练习会话失效重排：session={sessionId} 失效题数={invalidated} 剩余题数={remaining}",
    "练习会话结算完成：session={sessionId} score={score} mistakes={mistakes}",
    "练习会话导出：共 {count} 场"
  ],
  AnswerRecord: [
    "答题操作号已记：op={seq} session={sessionId} key={key} status=PENDING",
    "答题结算成功：op={seq} session={sessionId} correct={correct} status=SETTLED",
    "答题记录撤掉：op={seq} session={sessionId} reason={reason} status=ROLLED_BACK",
    "并发提交拦截：丢弃后到一笔 key={key} 胜出标签页={winnerTab} 现场保留标签页={loserTab}",
    "答题记录导出：共 {count} 条"
  ],
  Ledger: [
    "账本初始化：写入种子卡片 {symbols} 张、课程 {lessons} 门",
    "空间预警：使用率 {ratio}，清空可重建缓存 {bytes} 字节",
    "存储配额不足：先清缓存后重试账本写入 store={store}",
    "账本恢复扫描完成：未结算操作 {pendingOps} 条、半截会话 {crashedSessions} 场"
  ]
} as const;

export type LogEntity = keyof typeof LOG_TEMPLATES;
export type LogTemplate<E extends LogEntity> = (typeof LOG_TEMPLATES)[E][number];
