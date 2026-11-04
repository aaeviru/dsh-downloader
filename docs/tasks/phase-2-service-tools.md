# Phase 2 任务书 — DownloadService、Host↔Client 通信与 Agent 工具

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) Phase 2。

## Problem Statement

Phase 1 的能力只存在于 Host 进程内部：UI 看不到候选，Agent 也调不到。要让「同一个应用服务同时服务 UI 与模型」，先得确认当前 DSH 源码版本里 Host↔Client 通信到底走哪条路——**这一步不能靠猜**，issue 也把它列为前置验证。

## Solution

分两步：先做只读的技术验证并产出结论；再按结论实现应用服务、Remote 接口与三个模型工具。UI 本体留到 Phase 4。

## 前置验证（必须先完成，产出简短结论）

在 `/home/aaevi/projects/deepseek-harness` 源码中确认并记录：

1. **Host↔Client**：现有插件如何把 Host 数据送到 Client（Typert Remote / session-controller 投影 / 事件流），各举一个真实文件路径。
2. **服务注册**：`ctx` 上声明服务的实际写法（`declare module` 合并 + `Service` 子类），找一个 host 插件样例。
3. **工具注册**：模型工具的定义与注册入口（`ctx.tools`？），一个真实样例路径。
4. **凭据读取**：`ctx.credentials.resolve(credentialRef('ARIA2_TOKEN'))` 在 Desktop profile 下是否可用。

结论写进本文件的「验证结论」小节，再进入实现。**验证阶段不写业务代码。**

## Implementation Decisions

- `src/service.ts`：`DownloadService`，方法 `search(keyword)`、`listCandidates()`、`add(candidateId)`、`status(gid)`、`refresh()`；内部复用 Phase 1c 的协调器。
- Remote 接口按前置验证结论选择机制；**不新造通信框架**。
- 三个工具：`download_search`、`download_add`、`download_status`；参数显式校验；`download_add` 必须可追溯（记录触发者与时间）。
- 密钥只从 `ctx.credentials` / 环境读取，**禁止**经 Remote 下发到 Client。

## Testing Decisions

服务层用假 source/downloader 单测；工具用「假服务 + 参数校验」测试（拒绝缺参、拒绝未知 candidateId）；真实 Remote 链路等 Phase 4 在浏览器里验收。

## Out of Scope

UI 组件、轮询、规则、持久化。

## 验证命令

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/service.spec.ts packages/experimental/dsh-downloader/tests/tools.spec.ts
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
```

## 硬约束

不改 `scripts/`、`packages/bundle/`；不 import `@deepseek-ai/*` 的值（仅 `import type`）；不跑 git / pnpm install；不访问 NAS；不在日志或工具结果里输出 token。

跟踪 issue：[#5](https://github.com/aaeviru/dsh-downloader/issues/5)
