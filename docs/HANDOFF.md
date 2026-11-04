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

推送需要 gh 凭据助手（沙箱内没有 git 凭据）：

```sh
git -c credential.helper='!gh auth git-credential' push
```

## 2. 两条已踩过的路径坑

1. **`tsconfig.json` 只能用绝对路径**。TypeScript 不解析符号链接，同一份配置无法同时对「符号链接视角」和「真身视角」成立；相对路径在其中一个视角必然解析到错误位置。
2. **`tsdown.config.ts` 不能用仓库内相对路径**。它从真身目录加载，`../../client/tsdown.client.ts` 会解析到 `~/client`。改为从 `DSH_CHECKOUT`（默认 `/home/aaevi/projects/deepseek-harness`）定位构建预设。

换机器、改目录名、移植到 Windows 时，要同步改这三处：`tsconfig.json` 的 5 条绝对路径、`tsdown.config.ts` 的默认兜底值、profile 白名单里的路径。

## 3. 已完成

- 包骨架：`package.json`（`dsh-downloader@0.0.0`）、`tsconfig.json`、`tsdown.config.ts`、`src/index.ts`（空 `apply`）。
- 六个任务 issue：`#2` Phase 1a、`#3` Phase 1b、`#4` Phase 1c、`#5` Phase 2、`#6` Phase 3、`#7` Phase 4。
- 任务书原文：`docs/tasks/phase-*.md`，每份末尾链接对应 issue。
- `[CONTRACT v1]` 已发布在 [#2 的评论](https://github.com/aaeviru/dsh-downloader/issues/2#issuecomment-6639655269)，状态 `approval: PENDING`。
- **代码层面：除了空骨架，一行业务代码都没写。**

## 4. 协作协议（来自 `aaeviru/brainstorming`）

- 评论首行署名：`DeepSeek:`（plan/review 边界）、`Codex:`（worker 边界）。
- 交接链：`[CONTRACT vN]`（PROPOSED）→ 人类 `[DECISION] APPROVE CONTRACT vN` + 固定链接 → code-agent 实现并回 `[IMPLEMENTATION]`（commit SHA + 原始命令输出 + known_gaps）→ 独立边界重跑门禁并回 `[REVIEW]`（逐行为点 `VERIFIED / NOT_VERIFIED` + 证据）→ 人类 `[DECISION]`。
- Worker 自述不算证据；Build/lint/typecheck 通过只证明静态条件；单元测试不证明集成行为。
- 失败分类：`CODE_FAILURE` / `INFRA_FAILURE` / `BASELINE_FAILURE` / `SPEC_AMBIGUOUS` / `POLICY`。修复上限 2 轮后熔断。
- 默认单 Agent，只有实测收益才增加角色。

## 5. 环境事实

- aria2：`10.0.0.7:8082`（RFC1918 内网），从 WSL **TCP 可达**；`aria2.getVersion` 返回 `{"error":{"code":1,"message":"Unauthorized"}}` → 服务在跑，缺 token。
- token 来源：`ARIA2_TOKEN` 环境变量，或 `ctx.credentials`（存储优先 → env → `.env`，文件为 `~/.dsh/.credentials.yaml`）。**不要把 token 写进代码、日志、issue 或仓库。**
- 示例 RSS：`https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=0`。

## 6. 验收命令（执行者自检，验收方必须重跑）

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
```

门禁事实：测试 glob 是 `packages/*/*/tests/**/*.spec.{ts,tsx}`（符号链接目录会被扫到）；覆盖率按文件 100%（`packages/*/*/src/**`）。

## 7. 下一步

1. 人类在 #2 批准 `[CONTRACT v1]`。
2. 派 Codex 实现 Phase 1a，产物回 `[IMPLEMENTATION]`。
3. 独立重跑上面三条命令，回 `[REVIEW]`。
4. 之后依次 1b（可先不接真实 NAS，全 stub）→ 1c（真机验收需人类同意）→ Phase 2/3/4。

## 8. 明确未验证的

- 真实 RSS 站点的响应（`sukebei.nyaa.si` 在 WSL 内是否可访问未测）。
- 真实 aria2 提交（需 token + 人类同意，避免向 NAS 塞测试任务）。
- Desktop 安装形态（`plugin_manager install_bundle`）。
- `--patch + dev:web` 的端到端加载：需要起第二个服务，未执行。

## 9. 相关仓库

- [dsh-plugin-docs](https://github.com/aaeviru/dsh-plugin-docs) — 包骨架、门禁、Desktop 安装的踩坑记录。
- [hello-nodejs](https://github.com/aaeviru/hello-nodejs) — 已验证的 hello-page 骨架参照。
- [brainstorming](https://github.com/aaeviru/brainstorming) — 协作协议与实证案例。
