# Phase 1c 任务书 — 去重、提交记录与手动端到端链路

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) Phase 1「最小去重与已提交标记」「端到端验收」。

## Problem Statement

发现候选很容易，难的是**不重复提交**：同一个资源在重复刷新、重复搜索、RPC 超时重试后，都不能变成 NAS 上的两个任务。目前没有提交记录，也没有并发保护。

## Solution

在 source 与 downloader 之间放一个协调器，用「规范化去重键 + 提交记录 + 单飞保护」保证幂等；先内存实现，接口留给 Phase 3 换成持久化。

## Implementation Decisions

- 新增 `src/coordinator.ts`：`createDownloadCoordinator({ source, downloader, store })`。
- 三个接缝（interface，便于替换）：
  - `Source: { listCandidates(): Promise<Candidate[]> }`
  - `Downloader: { add(candidate): Promise<{ gid: string }>; status(gid): Promise<{ state }> }`
  - `SubmitStore: { has(key): boolean; record(key, gid): void; list(): SubmitRecord[] }`
- 对外方法：`refresh()` 返回 `{ discovered, added, skipped, unsubmittable }`；`submit(candidate)` 返回 `{ gid }` 或 `{ alreadySubmitted: gid }`。
- 幂等规则：以 `candidate.dedupeKey` 为唯一键；`submit` 前先查记录；**同一 key 同时只有一个在飞**（in-flight map），第二个调用直接返回 `alreadySubmitting`。
- 失败规则：`add` 抛错时**不写记录**；超时错误不重试，交由上层核对。
- 不构造 `submittable: false` 的候选去提交（直接返回 `unsubmittable`）。

## Testing Decisions

用假 source / 假 downloader（纯内存），**不联网**。

必须覆盖：空的 source；同一批内重复去重；刷新两次同样的 feed → 第二次 `added: 0, skipped: N`；重复 `submit` 同一 key → 返回同一个 gid 且 downloader 只被调用一次；并发两次 `submit` → 只有一个 `add` 调用；`add` 抛错后记录为空、可重试；`submittable: false` 不调用 downloader。

## Out of Scope

持久化（Phase 3）、轮询（Phase 3）、规则（Phase 3）、UI（Phase 4）。

## 人工验收（真实链路，仅在获得授权后）

用 `10.0.0.7:8082` + 示例 RSS 跑一次：刷新 → 选一条候选 → 提交 → 拿到 GID → 查询状态；再刷新一次确认不重复提交。**默认关闭自动提交**，只手动提交一条。

## 验证命令

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/coordinator.spec.ts
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
```

## 硬约束

同 Phase 1a/1b；另外：真实提交前必须得到用户明确同意，测试环境不得无意向 NAS 塞任务。

跟踪 issue：[#4](https://github.com/aaeviru/dsh-downloader/issues/4)
