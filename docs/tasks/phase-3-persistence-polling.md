# Phase 3 任务书 — 持久化、轮询与规则

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) Phase 3。

## Problem Statement

Phase 1c 的提交记录在内存里：重启 DSH 后去重状态丢失，同一资源会被再次提交。同时，轮询一旦跑起来，必须有重入保护与「默认只发现、不提交」的规则边界。

## Solution

把 `SubmitStore` 换成可持久实现（优先 `ctx.storageDomain`，前置验证其可写与重启后读取），再接一个进程内调度器与最小规则引擎。

## Implementation Decisions

- 持久化：`src/store.ts` 实现 Phase 1c 的 `SubmitStore` 接口；键 = `dedupeKey`，值 = `{ gid, title, submittedAt, trigger: 'manual' | 'rule' | 'tool' }`。**先验证 `ctx.storageDomain` 在 Desktop profile 下可用**，不可用再退回 JSON 文件（在 `~/.dsh` 下，0600）。
- 轮询：`src/poller.ts`，周期来自配置；`in-flight` 标记防重入；进程退出即停止（v0.1 明确接受）。
- 规则：`src/rules.ts`，最小能力 = 关键词包含匹配 + 每轮提交上限；`autoSubmit` **默认 false**，必须显式开启；开启后每轮最多提交 N 条（默认 1）。
- 配置项全部走插件 `static Config`（zod schema），不写死常量。

## Testing Decisions

- store：写入 → 重新实例化 → 读回（模拟重启）；重复写同一键不产生重复。
- poller：用假定时器验证重入保护（上一轮未完成时不启动下一轮）；停止后不再调用。
- rules：匹配 / 不匹配 / 超上限时只提交前 N 条 / `autoSubmit: false` 时零提交。

## Out of Scope

分布式锁、多进程、跨设备同步、NAS 端 Worker。

## 验证命令

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/store.spec.ts packages/experimental/dsh-downloader/tests/poller.spec.ts packages/experimental/dsh-downloader/tests/rules.spec.ts
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
```

## 硬约束

不新增数据库依赖（除非前置验证证明 storageDomain 不可用并获用户同意）；不在日志输出 token；轮询失败不得静默——每次失败要能被 UI 看到。
