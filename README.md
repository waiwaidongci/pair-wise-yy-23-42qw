# 盲文点字学习训练器

纯前端盲文点字学习与练习工具，支持点阵字符卡片、听写练习、错题本和学习进度统计。核心是一套**可恢复账本**：开练时冻结课程与卡片快照，答题先记操作号，重启后补齐或撤掉未结算记录；卡片或课程变化后未完成题目失效重排；两个标签页并发提交时只结算一笔，后到页面保留现场；空间不足时先清可重建缓存，课程和答题账本留下。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20111>

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Material UI + Zustand + IndexedDB |
| 后端 | - |
| 数据库 | IndexedDB（账本数据库） |

## 可恢复账本设计

### 核心概念

| 概念 | 说明 | 存储 |
|---|---|---|
| 账本操作（LedgerEntry） | 只追加的操作日志，`op_id` 自增，全局单调 | `ledger_entries` |
| 会话（PracticeSession） | 练习会话，引用冻结快照 | `sessions` |
| 答题记录（AnswerRecord） | 已结算的答题，由账本操作驱动 | `answer_records` |
| 课程（Lesson） | 课程账本，版本哈希标识 | `lessons` |
| 卡片（BrailleSymbol） | 卡片账本，版本哈希标识 | `symbols` |
| 快照（SessionSnapshot） | 开练时冻结的课程+卡片快照，**可重建缓存** | `snapshots` |
| 会话锁（SessionLock） | 跨标签页原子租约，保证并发只结算一笔 | `session_locks` |

### 工作流程

1. **开练冻结快照**：创建会话时，把当前课程与卡片数据固化为不可变快照，后续卡片/课程变化不影响已开始的会话。
2. **答题先记操作号**：提交答案时，先在 `ledger_entries` 追加一条 `pending` 记录（写操作号），再在会话锁保护下结算。
3. **重启补齐或撤掉**：应用启动时执行崩溃恢复，找出所有进行中的会话：
   - 快照未失效 → 补齐所有 `pending` 操作（写入答题记录）
   - 快照已失效 → 撤掉 `pending` 操作（标记 `revoked`），并用当前数据重排题目
4. **卡片/课程变化失效重排**：课程或卡片保存时更新版本哈希，依赖该快照的未完成会话在恢复时撤账并重排。
5. **两标签页并发只结算一笔**：提交前先获取会话锁（租约），抢占失败者不结算，保留现场（提示"另一标签页正在结算"）。
6. **空间不足先清缓存**：写入遇 `QuotaExceededError` 时，清理可重建的快照缓存，课程与答题账本保留。

### 关键文件

```
frontend/src/
├── utils/ledgerDb.ts          # IndexedDB 账本数据库（事务、锁、op_id）
├── utils/snapshotHasher.ts    # 快照版本哈希（SHA-256）
├── utils/quotaManager.ts      # 配额保护（先清缓存）
├── utils/seedLedger.ts        # 首次种子数据写入
├── services/SnapshotService.ts    # 快照冻结/失效/重建
├── services/LedgerService.ts      # 结算/撤账
├── services/RecoveryService.ts    # 崩溃恢复
├── controllers/PracticeController.ts  # 练习流程编排
├── api/Ledger.ts              # 账本操作 API
├── api/SessionSnapshot.ts     # 快照 API
├── stores/LedgerStore.ts      # 账本状态
├── stores/RecoveryStore.ts    # 恢复状态
├── hooks/useRecoverableSession.ts  # 可恢复会话 hook
├── hooks/useLedgerRecovery.ts      # 启动恢复 hook
├── hooks/useSessionLock.ts         # 会话锁 hook
└── workers/recoveryWorker.ts       # 后台恢复 Worker
```

## 项目目录结构

```text
frontend/src/api, stores, types, constants, constructors, components/common, hooks, pages, router, utils, mocks, services, controllers, workers
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `braille-trainer`
- `FRONTEND_PORT`: 前端端口，默认 `20111`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: braille-trainer`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-braille-trainer}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- PracticeMode: constants/PracticeMode、types/PracticeMode、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- SymbolCategory: constants/SymbolCategory、types/SymbolCategory、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- MasteryLevel: constants/MasteryLevel、types/MasteryLevel、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- LedgerStatus: constants/LedgerStatus、types/LedgerEntry、constructors、logTemplates、stores、展示组件均有引用。
- SnapshotStatus: constants/SnapshotStatus、types/SessionSnapshot、services、展示组件均有引用。
- LockStatus: constants/LockStatus、types/SessionLock、utils/ledgerDb、hooks、展示组件均有引用。
- SessionStatus: constants/SessionStatus、types/PracticeSession、api、stores、展示组件均有引用。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。账本系统的加入使得"操作号—快照—锁—恢复"形成跨文件的耦合网络，任何一处变更都需要同步多处。

## License

MIT
