# Phase 1b 任务书 — aria2 JSON-RPC 适配器（不碰 NAS）

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) Phase 1「aria2」一项。

## Problem Statement

Host 侧必须能通过 JSON-RPC 与 NAS 上的 aria2 通信：测连接、提交磁力、查任务状态。目前没有任何代码证明这条链路成立，而直接对着真实 NAS 调试会把每次失败都变成一次真实下载尝试。

## Solution

先实现一个**可注入传输层**的最小 aria2 客户端，全部测试跑在本地 stub HTTP 服务器上。真实 NAS（`10.0.0.7:8082`）只在最后的**人工验收**里碰一次。

## Implementation Decisions

- 新增 `src/aria2.ts`：`createAria2Client(config, transport?)`，`transport` 默认 `fetch`，测试注入 stub。
- 接口（只做 v0.1 需要的三个方法）：
  - `getVersion()` → `{ version, enabledFeatures }`
  - `addUri(uris, options?)` → `{ gid }`
  - `tellStatus(gid)` → `{ gid, status, totalLength?, completedLength?, errorMessage? }`
- 协议细节：JSON-RPC 2.0，`POST <endpoint>`，body `{ jsonrpc: '2.0', id, method, params }`；有 token 时 `params[0] = "token:<token>"`，无 token 时省略，**不得传空串**。
- 错误映射（显式类型，不抛裸字符串）：
  - RPC `error.code === 1`（Unauthorized）→ `Aria2AuthError`
  - 超时 → `Aria2TimeoutError`
  - 非 2xx / 非 JSON → `Aria2ProtocolError`（带 status 与响应前 200 字节）
- **`addUri` 绝不自动重试**：超时后不重发，交给上层按提交记录核对（issue 的安全要求）。
- token 只从调用方传入，**禁止**写进日志、错误消息或 `toString`。

## Testing Decisions

只测外部行为：给定 HTTP 响应，客户端返回什么、抛什么类型。用 `node:http` 起 `127.0.0.1:0` 的 stub，**不访问 10.0.0.7**。

必须覆盖：成功 `getVersion`；`addUri` 返回 gid；Unauthorized → `Aria2AuthError`；超时 → `Aria2TimeoutError`；HTTP 500 → `Aria2ProtocolError`；响应非 JSON → `Aria2ProtocolError`；`token` 为 null 时 params 里没有 token 项；`addUri` 超时后 stub 只收到 1 次请求。

## Out of Scope

`addTorrent`（.torrent 文件路径）、断线重连、多下载器抽象、真实 NAS 调用。

## 验证命令

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/aria2.spec.ts
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
```

## 硬约束

不改 `scripts/`、`packages/bundle/`；不 import `@deepseek-ai/*` 的值；不跑 git / pnpm install；不访问真实 NAS；不用 `any` / `as unknown`；每个分支都要有用例（覆盖率按文件 100%）。

跟踪 issue：[#3](https://github.com/aaeviru/dsh-downloader/issues/3)
