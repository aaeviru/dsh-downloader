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

## 验证结论（2026-11-05，DeepSeek）

### 1. Host↔Client 的三条现成路径

| 机制 | 真实样例 | 要点 |
|---|---|---|
| Typert Remote（生成式命名空间） | `packages/api/job-controller/src/index.ts:42,59,75` | `class X extends TypertRemoteService`；`super(ctx, 'jobController', { namespace: 'job' })`；方法用 `@Remote(...)` 标注；客户端经 `ctx.remote.<ns>.<method>` 调用 |
| 客户端流式消费 | `packages/client/product-analytics/src/client/index.ts:30-31` | `ctx.remote.$stream({ name, open: signal => ctx.remote.<ns>.<stream>(signal) })` |
| Session projection（事件折叠成视图） | `packages/todo/tool-todo/src/index.ts:126` | `ctx.sessionProjections.register({ key, stateSchema, init, apply, wire: { viewSchema, view } })` |

**结论**：候选与下载任务不是会话事件，projection 要求「模型可见即入日志」，套用会污染会话格式；应走 **Typert Remote**。

### 2. 服务注册

`packages/api/job-controller/src/index.ts:22-27`：`declare module '@deepseek-ai/cordis' { interface Context { jobController: JobController } }` + `Service` 子类 + `static inject` + `static Config`（schemastery）。纯 Service 样例另见 `packages/context/file-reference-local/src/index.ts:38`。

### 3. 工具注册

`packages/todo/tool-todo/src/index.ts:136`：`ctx.tools.register(defineTool({ name, description, parameters, output, ... }))`，`defineTool` 来自 `@deepseek-ai/dsh-tools`。

### 4. 凭据

- 接口：`packages/credentials/credentials/src/index.ts:184` `abstract resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>`；`ResolvedCredential = { value, source }`（同文件 :118）。
- 提供方：`@deepseek-ai/dsh-credentials-local` 注册在 `packages/bundle/base/cordis.patch.yml:125-126`；解析链 = 托管 `.credentials.yaml` → 环境变量 → 项目 `.env` → 用户 `.env`。
- Desktop profile：`apps/desktop/src/host-process.ts` 通过子进程启动 dsh runtime，其 profile 组合文件未在本轮源码中定位到，**未实测**；结构上 base 层已注册该服务。结论：机制可用，Desktop 侧留待 Phase 4 桌面验收确认。

### 5. 未决问题：Typert 生成的越界

Typert 的客户端类型由生成器产生，生成范围是 harness 内的 `packages/*/*`。本包是符号链接进来的**外部仓库**：生成器若扫描它，需要在 harness 侧登记包名并重跑生成（会改动 harness 仓库并提交生成物）；若不扫描，客户端就拿不到 `ctx.remote.download` 的类型。

两条路：

- **(a)** 在 harness 侧登记本包并重跑 typert 生成 —— 改动 harness 仓库，需人类同意。
- **(b)** Phase 2 只做 Host 侧 `DownloadService` + 三个模型工具（服务端可用、模型可调），Remote 命名空间与 UI 一起放到 Phase 4。

**本阶段采用 (b)**：任务书的验收标准本就是「服务层单测 + 工具单测」，UI 在 Phase 4；这样不会提前改动 harness 仓库。若选 (a)，补 Remote 是增量改动，不影响已实现的 Service 与工具。
