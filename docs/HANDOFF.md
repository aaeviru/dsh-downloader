# HANDOFF — dsh-downloader

给下一条会话（尤其是「创造模式」会话）的交接档。所有结论都附了它来自哪一步，避免把记忆当事实。

## 1. 仓库与工作区接线

| 项 | 值 |
|---|---|
| 插件真身 | `~/projects/dsh-downloader`（git 远端 `aaeviru/dsh-downloader`，分支 `main`） |
| 工作区内的入口 | `packages/experimental/dsh-downloader` → **符号链接**指向真身 |
| 污染防护 | dsh 仓库的 `.git/info/exclude` 已加该路径，`git status` 不显示 |
| 会话工作区（写边界） | `/home/aaevi/projects/deepseek-harness` |
| 沙箱模式 | `workspace-write` + 四个常设例外 |

例外写在 `~/.dsh/profiles/web/cordis.patch.yml` 的 `sandbox-policy.additionalWritableRoots`：

```
/home/aaevi/projects/dsh-plugin-hello-page
/home/aaevi/projects/dsh-downloader
/home/aaevi/.agents
/home/aaevi/.local/share/pnpm/store
```

注意：include 的 patch 是**按 key 浅替换**，所以该条目必须连带重复 `mode` 与 `workspaceRoot`，否则会被默认值覆盖成 `read-only`。

### 依赖安装：只能在 harness 根目录跑

新依赖写进 `package.json` 后，**在 harness 根目录**执行：

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm install --filter dsh-downloader
```

理由：`@deepseek-ai/cordis` 用的是 `workspace:~` 协议，只在 pnpm workspace 内解析。符号链接让这个包**本来就是 workspace 成员**（`pnpm list -r` 会列出 `dsh-downloader@0.0.0 ... (PRIVATE)`），根目录安装会把它当普通成员处理，依赖以 pnpm 软链接进 `node_modules`。

**不要在 `~/projects/dsh-downloader` 里跑任何安装命令**：`npm install` 直接 `EUNSUPPORTEDPROTOCOL: workspace:~`，`pnpm install` 因为没有 workspace 定义也会失败。手工建软链或拷贝目录是错的做法（曾试过一次，已废弃）。

**副作用**：根目录安装会在 `pnpm-lock.yaml` 增加一条 importer 记录（`packages/experimental/dsh-downloader:`）。**这个改动永远不要提交** —— CI 上没有该目录，`--frozen-lockfile` 会失败。`pnpm-lock.yaml` 的 `M` 状态是预期的（`hello-page` 那条也是同样来源）。

### 推送

需要 gh 凭据助手（沙箱内没有 git 凭据）：

```sh
git -c credential.helper='!gh auth git-credential' push
```

## 2. 已踩过的路径坑

1. **`tsconfig.json` 只能用绝对路径**。TypeScript 不解析符号链接，同一份配置无法同时对「符号链接视角」和「真身视角」成立；相对路径在其中一个视角必然解析到错误位置。
2. **`tsdown.config.ts` 不能用仓库内相对路径**。它从真身目录加载，`../../client/tsdown.client.ts` 会解析到 `~/client`。改为从 `DSH_CHECKOUT`（默认 `/home/aaevi/projects/deepseek-harness`）定位构建预设。
3. **派 Codex 必须以真身目录为 cwd**。它的 `sandbox_mode = "workspace-write"` 以启动 cwd 为唯一写根，`~/.codex/config.toml` 只 trust 了 `deepseek-harness`；从 harness 启动时写入真身会被判成「项目外」，报 `Read-only file system`。用 `cwd=/home/aaevi/projects/dsh-downloader` 启动即可。

换机器、改目录名、移植到 Windows 时，要同步改这四处：`tsconfig.json` 的 5 条绝对路径、`tsdown.config.ts` 的默认兜底值、profile 白名单里的路径、以及 Codex 的启动 cwd。

## 3. 已完成

- 包骨架：`package.json`、`tsconfig.json`、`tsdown.config.ts`、`src/index.ts`（空 `apply`）。
- `[CONTRACT v1]` 已批准（[#2 comment 6656215906](https://github.com/aaeviru/dsh-downloader/issues/2#issuecomment-6656215906)）。
- **Phase 1a 已实现并提交**：`6b8e6e2 feat: parse RSS feeds into normalized candidates`。
  - `src/candidate.ts`：`Candidate`、`normalizeInfoHash`（hex + base32）、`dedupeCandidates`
  - `src/rss.ts`：`RssParseError`、`parseRssFeed`（RSS 2.0 / RSS 1.0 RDF / Atom）
  - `tests/`：3 个 spec、23 条用例、9 个 fixture
  - `docs/tasks/phase-1a-fixtures.md`：fixture 清单、补充用例 B11–B16、把 10 个含糊点定死
- `[REVIEW]` 已发（[#2 comment 6657197425](https://github.com/aaeviru/dsh-downloader/issues/2#issuecomment-6657197425)），B1–B16 全部 VERIFIED。**等待人类 `[DECISION]`。**
- **Phase 1b 已实现并提交**：`388103c feat: add an aria2 JSON-RPC client with an injectable transport`。
  - `src/aria2.ts`：`createAria2Client(config, transport?)`、`getVersion` / `addUri` / `tellStatus`、四类错误（`Aria2AuthError` / `Aria2TimeoutError` / `Aria2ProtocolError` / 基类 `Aria2Error`）
  - `tests/aria2.spec.ts`：14 条用例，全部打 `127.0.0.1:0` 的 stub，不访问真实 NAS
  - `[CONTRACT v2]` 挂在 #3；`[REVIEW]` 已发（[#3 comment 6657364070](https://github.com/aaeviru/dsh-downloader/issues/3#issuecomment-6657364070)），B1–B9 全部 VERIFIED。**等待人类 `[DECISION]`。**
- **Phase 1c 已实现并提交**：`9b30a16 feat: coordinate submissions with recorded keys and in-flight protection`。
  - `src/coordinator.ts`：`createDownloadCoordinator({ source, downloader, store })`、`refresh()` / `submit()`、单飞保护（每实例 in-flight map）、四类返回值
  - `tests/coordinator.spec.ts`：12 条用例，纯内存假接缝，不起 socket
  - `[CONTRACT v3]` 挂在 #4（含一处规格矛盾的裁决：`refresh()` 自动提交）；`[REVIEW]` 已发（[#4 comment 6657462793](https://github.com/aaeviru/dsh-downloader/issues/4#issuecomment-6657462793)），B1–B8 全部 VERIFIED。**等待人类 `[DECISION]`。**
  - **人工端到端验收未做**：接真实 NAS 提交一条的任务书要求「必须得到用户明确同意」，尚未授权。
- 六个任务 issue：`#2` Phase 1a（已实现 + 已 review）、`#3` 1b（已实现 + 已 review）、`#4` 1c（已实现 + 已 review）、`#5` Phase 2、`#6` Phase 3、`#7` Phase 4。

## 4. 协作协议（来自 `aaeviru/brainstorming`）

- 评论首行署名：`DeepSeek:`（plan/review 边界）、`Codex:`（worker 边界）。
- 交接链：`[CONTRACT vN]`（PROPOSED）→ 人类 `[DECISION] APPROVE CONTRACT vN` + 固定链接 → code-agent 实现并回 `[IMPLEMENTATION]`（commit SHA + 原始命令输出 + known_gaps）→ 独立边界重跑门禁并回 `[REVIEW]`（逐行为点 `VERIFIED / NOT_VERIFIED` + 证据）→ 人类 `[DECISION]`。
- Worker 自述不算证据；Build/lint/typecheck 通过只证明静态条件；单元测试不证明集成行为。
- 失败分类：`CODE_FAILURE` / `INFRA_FAILURE` / `BASELINE_FAILURE` / `SPEC_AMBIGUOUS` / `POLICY`。修复上限 2 轮后熔断。
- 默认单 Agent，只有实测收益才增加角色。
- **任务书用门禁报错原文**：一旦精确到「文件 + 行 + 报错原文 + 修法」，执行质量很高；模糊描述会在门禁上反复翻车（见 `aaeviru/dsh-plugin-docs` 的 08）。

## 5. 环境事实

- aria2：`10.0.0.7:8082`（RFC1918 内网），从 WSL **TCP 可达**；`aria2.getVersion` 返回 `{"error":{"code":1,"message":"Unauthorized"}}` → 服务在跑，缺 token。
- token 来源：`ARIA2_TOKEN` 环境变量，或 `ctx.credentials`（存储优先 → env → `.env`，文件为 `~/.dsh/.credentials.yaml`）。**不要把 token 写进代码、日志、issue 或仓库。**
- 示例 RSS：`https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=0`。一次真实抓取的 75 条结果在 `~/.dsh/attachments/` 内（B14 证据来自全量；入库 fixture 只取 6 条）。

## 6. 验收命令（执行者自检，验收方必须重跑）

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
pnpm exec oxlint -c .oxlintrc.json packages/experimental/dsh-downloader
```

覆盖率（仓库用 v8，按文件 100%）：

```sh
cd /home/aaevi/projects/dsh-downloader
/home/aaevi/projects/deepseek-harness/node_modules/.bin/vitest run --coverage --coverage.include='src/**'
```

门禁事实：测试 glob 是 `packages/*/*/tests/**/*.spec.{ts,tsx}`（符号链接目录会被扫到）；覆盖率按文件 100%（`packages/*/*/src/**`）；lint 是 **oxlint**（`pnpm exec oxlint -c .oxlintrc.json`），仓库没有 prettier/eslint 配置。

已知限制：**Codex worker 在其沙箱内跑不了上面第一条**（harness 检出只读，Vite 写 `node_modules/.vite-temp` 报 EROFS）。它用仓库内等价命令自检并如实标注，权威结果由验收方重跑 —— 这是既定流程，不是缺陷。

**Codex 的沙箱还禁止本地监听**：任何 `server.listen(127.0.0.1)` 都会 `EPERM`。所以凡是用 `node:http` 起 stub 的测试（如 `tests/aria2.spec.ts`），执行方一条都跑不了，覆盖率也无法自测；这类测试只能由验收方跑。派活时别指望它自证。

## 7. 下一步

1. 人类在 #2 / #3 / #4 对各 `[REVIEW]` 回 `[DECISION]`。
2. 真实链路验收（1c）：需要人类明确同意后，用 `10.0.0.7:8082` + 示例 RSS 手动提交一条，**默认不自动提交**。
3. Phase 2（#5）→ Phase 3（#6）→ Phase 4（#7）。

## 8. 明确未验证的 / 已知缺口

- **bundle 产物仍是 0.51 kB**：`src/candidate.ts` 与 `src/rss.ts` 未从 `src/index.ts` 导出，Phase 1a 是源码级交付；插件接线在后续阶段。别把「bundle 通过」当成新代码已进产物。
- 真实 RSS 站点的响应（`sukebei.nyaa.si` 在 WSL 内的实时可达性未测；上次抓到的是快照）。
- 真实 aria2 提交（需 token + 人类同意，避免向 NAS 塞测试任务）。
- Desktop 安装形态（`plugin_manager install_bundle`）。
- `--patch + dev:web` 的端到端加载：需要起第二个服务，未执行。

## 9. 相关仓库

- [dsh-plugin-docs](https://github.com/aaeviru/dsh-plugin-docs) — 包骨架、门禁顺序、Codex 协作流程的踩坑记录（08 协作流程、10 坑位速查必读）。
- [hello-nodejs](https://github.com/aaeviru/hello-nodejs) — 已验证的 hello-page 骨架参照。
- [brainstorming](https://github.com/aaeviru/brainstorming) — 协作协议与实证案例。
