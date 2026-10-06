# 盲文点字学习训练器

纯前端盲文点字学习与练习工具，支持点阵字符卡片、听写练习、错题本和学习进度统计。课程、练习会话、答题记录以 **IndexedDB 可恢复账本** 串联：开练冻结快照、答题两阶段提交、崩溃重启自动补齐/撤掉、卡片或课程改版后未完成题失效重排、双标签页并发只结算一笔、空间不足先清可重建缓存。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

访问 <http://localhost:20111>

## 本地开发方式

```bash
cd frontend
npm install
npm run dev          # http://localhost:20111
npm run build        # 类型检查 + 生产构建
npm run test:ledger  # 账本集成测试（fake-indexeddb，10 个场景）
npm run test:smoke   # 四页 + 七个共享组件 SSR 渲染冒烟
```

## 可恢复账本设计（核心）

### 1. 开练即冻结快照

`startPracticeSession` 建会话时把课程（`lesson_snapshot`）和本场涉及的全部卡片（`symbol_snapshots`）连同内容指纹 `content_fingerprint` 一起冻结进会话：

- 判分只认冻结快照，老师中途改卡片不影响进行中的会话；
- 每条 `AnswerRecord` 都钉一份当时的 `symbol_snapshot`，**旧错因永远有依据**；
- 课程/卡片每次保存内容版本 `version +1`，作为失效判定依据。

### 2. 答题先记操作号，两阶段提交

`answer_op_logs` 是自增操作号（seq）的 WAL：

1. `ANSWER_SUBMIT/PENDING`（操作号 + 提交意图）先落盘；
2. 写 `answer_records/PENDING`（幂等键 `session:<id>:question:<序号>` 建**唯一索引**）；
3. 同一事务内把操作置 `COMMITTED`、记录置 `SETTLED`，推进会话。

重启时 `recoverLedger()` 扫描所有 PENDING 操作：有 PENDING 记录现场 → **补齐** SETTLED 并推进会话；无现场 → **撤掉**（操作 ABORTED，残留记录 ROLLED_BACK，留痕但不进错题本/统计）。

### 3. 卡片/课程变化后失效重排

`reconcileInTx` 在每次提交前、进入/切回半截会话、崩溃恢复时执行：

- 卡片版本变化 → `SYMBOL_CHANGED`；课程移除卡片 → `SYMBOL_REMOVED`；课程消失 → `LESSON_CHANGED`；
- 失效题写 `invalidated_questions` 台账（带冻结版本/当前版本），剩余题重新洗牌排队；
- 一题未答且全失效 → 会话 `ABANDONED`；已答题与冻结快照原样保留。

### 4. 两个标签页并发只结算一笔

- 快路径：提交前按幂等键查到 SETTLED 即直接返回 `DUPLICATE_REJECTED`；
- 事务内再裁决一次：IndexedDB 串行化读写事务，后到者撞唯一索引或读到已结算记录即认负，自己的操作号置 `ANSWER_ABORT`，**不清空输入框，后到页面保留现场**，并提示胜出标签页与正确答案。

### 5. 空间不足：先清可重建缓存

IndexedDB 仓库分两类：

| 类别 | 仓库 | 配额紧张时 |
|---|---|---|
| 账本（必须留下） | `braille_symbols` `lessons` `practice_sessions` `answer_records` `answer_op_logs` `invalidated_questions` | 永不删除 |
| 可重建缓存 | `cache`（进度统计聚合等，带来源指纹） | 优先整体清空，再重试账本写入 |

`withCacheEvictionOnQuota` 捕获 `QuotaExceededError` 后清缓存重试；启动时 `navigator.storage.estimate` 剩余低于 12% 会预防性清缓存。

### 账本相关文件

```text
src/db/ledgerDb.ts                IndexedDB 建库/事务助手/配额清理
src/db/ledgerInit.ts              首次播种 + 初始化单例
src/services/PracticeLedgerService.ts  开练冻结/两阶段答题/失效重排/崩溃恢复
src/services/BrailleSymbolService.ts   卡片保存（内容变化 version+1）
src/services/LessonService.ts          课程保存（内容变化 version+1）
src/services/grading.ts               判题与错因归类（依据冻结快照）
src/services/CacheService.ts          可重建缓存读写
src/services/StatisticsService.ts     只认 SETTLED 的聚合（缓存）
src/services/LedgerError.ts           service/controller 两层异常包装
src/types/AnswerOpLog.ts              操作日志类型
src/types/InvalidatedQuestion.ts      失效台账类型
src/types/RebuildableCache.ts         缓存条目类型
scripts/ledger.test.ts                10 个账本场景的集成测试
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Material UI（依赖保留）+ Zustand |
| 存储 | IndexedDB（七个对象仓库，见上） |
| 测试 | fake-indexeddb + tsx（账本）、jsdom（渲染冒烟） |
| 部署 | Docker Compose + Nginx（SPA try_files） |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async API（落 IndexedDB，保留 /api 切换位）
├── stores/               # Zustand 独立 store
├── types/                # 数据模型与 WAL/失效/缓存类型
├── constants/            # 枚举、日志模板、错误码与错误消息、状态文案
├── constructors/         # 默认对象/开练快照构造器/待结算记录构造器
├── components/common/    # BrailleCell/LessonProgress/PracticePanel/ResultBadge/ChartPanel 等
├── hooks/                # useBraillePattern/usePracticeSession/useIndexedDbStore
├── pages/                # 学习卡片/练习模式/错题本/学习进度
├── router/               # hash 路由表
├── services/             # 账本、判题、缓存、统计、异常包装
├── db/                   # IndexedDB 底座与播种
├── utils/                # logger/formatters/tabIdentity
├── mocks/                # 首次播种种子（真实盲文点位）
└── workers/              # 预留
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`：Compose 项目名，默认 `braille-trainer`
- `FRONTEND_PORT`：前端端口，默认 `20111`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: braille-trainer`；
- 容器名 `${COMPOSE_PROJECT_NAME:-braille-trainer}-frontend`，端口 `${FRONTEND_PORT:-20111}:80`；
- 纯前端无命名卷，数据在浏览器 IndexedDB 中；清站点数据即重置账本；
- 常见问题：端口占用改 `.env`；中文目录名可正常构建启动；SPA 深链由 `try_files $uri $uri/ /index.html;` 兜底。

## 枚举/常量出现位置清单

- **PracticeMode**：`constants/PracticeMode.ts`（值+文案+复数别名）、`types/PracticeMode.ts`（重复类型声明）、`constructors/PracticeSessionConstructor.ts`（开练构造）、`constants/logTemplates.ts`（会话/答题模板）、`constants/errorMessages.ts`、`stores/PracticeSessionStore.ts`（start 入参）、`components/common/StatusBadge.tsx`、`components/common/PracticePanel.tsx`（模式文案）、`pages/PracticePage.tsx`（模式选择器）、`pages/ProgressPage.tsx`（列表展示）。
- **SymbolCategory**：`constants/SymbolCategory.ts`、`types/SymbolCategory.ts`、`constructors/BrailleSymbolConstructor.ts`、`constants/logTemplates.ts`、`components/common/StatusBadge.tsx`、`pages/LearnPage.tsx`（分类筛选/编辑表单）。
- **MasteryLevel**：`constants/MasteryLevel.ts`、`types/MasteryLevel.ts`、`constants/statusText.ts`、`components/common/StatusBadge.tsx`。
- **SessionStatus / AnswerStatus**（账本态）：`types/PracticeSession.ts`、`types/AnswerRecord.ts`、`services/PracticeLedgerService.ts`、`components/common/ResultBadge.tsx`、错题本/进度页筛选。
- **InvalidationReason**：`types/InvalidatedQuestion.ts`、`services/PracticeLedgerService.ts`、练习页提示。

## 为什么会牵一发动全身

枚举在 constants 与 types 双处维护；日志模板集中在 `logTemplates`，每个写操作都经 `utils/logger`；错误码/错误消息分离且 service、controller(api/store) 两层分别包异常；默认对象、冻结快照、待结算记录分别有独立 constructor；`formatters` 混合日期/点位/耗时/风险等级被多页共用。一次内容字段变更要同步类型、构造器、快照、判题、日志模板、错误消息、徽章文案、种子与测试。

## License

MIT
