# DSH Downloader 开发工作流规范 v1.0

本规范采用简化的 GitHub Flow，并为 Agent 协作增加可追溯的 Review Gate。它约束本仓库的需求、实现、验证、审查和交付方式；`main` 始终代表稳定基线。

> 生效说明：本文件记录目标流程。规则是否已经由 GitHub 或 CI 技术强制，必须以仓库当时的实际配置和运行证据为准，不能仅凭本文宣称。
>
> 不在本文范围：`main` 分支保护由仓库所有者自行配置；从既有 55 个 `main` 提交迁移的计划记录在 [Issue #13](https://github.com/aaeviru/dsh-downloader/issues/13)。本文和相关 PR 仅引用该 Issue，不自动关闭它。

## 1. 核心原则

- Issue 定义任务边界；PR 承载实现；验证提供技术证据；Critic 提供审查证据；人类决定是否合入。
- 所有变更从最新 `main` 派生短期分支并通过 PR 返回；Agent 不直接推送 `main`，也不自行合并 PR。
- 一个 Issue 原则上对应一个主要 PR。一个 PR 可以有多个开发提交，但不能顺手混入无关修改。
- 每项功能应能独立审查、合入和回退。不要引入 `develop`、`release` 等长期分支。
- 自动检查只能证明其覆盖的条件；Worker 自述、构建通过和单元测试通过都不能替代未执行的集成或人工验收。

## 2. Issue Contract 与短分支

### 2.1 Issue Contract

除小型拼写或纯格式修正外，修改前必须有 Issue Contract。小型修正可以没有独立 Issue，但仍须使用分支和 PR。业务规则、架构、Agent 规范、CI、构建和依赖变更不属于小型修正。

Issue Contract 至少包含：

1. 问题与目标；
2. 可观察的验收标准；
3. 允许修改的文件、模块或系统边界；
4. 明确禁止修改的内容；
5. 测试与验证要求，包括需要人工验证的部分；
6. 已知风险、依赖、非目标和回退方式；
7. 需要人类先裁决的歧义。

Contract 是 Worker 的执行边界。发现范围外问题时，Worker 应记录并交回 Orchestrator 或人类，不得以“顺手修复”为由扩大 PR。

本项目特别约束：插件仓库与 DSH harness 的职责必须分开。未经 Contract 明确授权，不得为了让检查通过而修改 harness workspace、根 lockfile、根 TypeScript 配置、凭据或用户 profile；也不得把本机绝对路径当作可移植方案提交。

### 2.2 分支命名

所有任务分支从最新 `main` 派生：

| 类型 | 命名 | 示例 |
| --- | --- | --- |
| 新功能 | `feat/<issue>-<slug>` | `feat/123-rss-parser` |
| Bug 修复 | `fix/<issue>-<slug>` | `fix/124-dedup` |
| 重构 | `refactor/<issue>-<slug>` | `refactor/125-provider` |
| 文档 | `docs/<issue>-<slug>` | `docs/126-installation` |
| 工具、构建、CI、流程 | `chore/<issue>-<slug>` | `chore/127-ci-setup` |

分支只服务一个任务，PR 结束后删除。若任务被拆分，每个新范围应有自己的 Issue/Contract 和分支。

## 3. PR 与 `[REVIEW]`

### 3.1 PR 最低内容

PR 正文至少包含以下信息。仓库将来落地模板时可以调整排版，但不能丢失这些语义：

```markdown
## Summary

<最小的文件树、流程图或差异摘要>

关联 Issue：#123

## Implementation

- <做了什么>
- <明确未做什么>

## Evidence

- Before: <修改前事实或缺口>
- After: <命令、输出、截图或其他可复核证据>
- Verification: <PASS / FAIL / NOT RUN 及原因>

## [REVIEW]

Status: PENDING | PASS | FAIL
Critic: <身份>
Reviewed commit: <完整 commit SHA>
Evidence: <PR Review 永久链接或审查记录>

## Merge Danger

Door: one-way | two-way
Blast Radius: <影响范围>
Risks / Rollback: <风险和回退方式>
```

普通任务可使用 `Closes #123` 在合入默认分支后关闭其实现 Issue。仅作参考、后续迁移或不应随当前 PR 关闭的 Issue，必须使用 `Refs #123`、`Related to #123` 或普通链接，不能使用 `Closes`、`Fixes`、`Resolves` 等关闭词。

### 3.2 Review 必须绑定实际代码版本

`[REVIEW]` 必须记录被审查的 commit SHA，不能只绑定 Issue 编号、分支名或 PR 编号。

1. Worker 推送提交 A。
2. Critic 对 A 给出 `[REVIEW] PASS`，并记录 A 的 SHA。
3. Worker 又推送提交 B。
4. A 的 PASS 不再覆盖 PR 最新版本。Critic 必须审查 A→B 的受影响差异，并把结论绑定到 B。

PR 在满足以下条件前不能称为 Ready for Merge：

- PR HEAD 与 `Reviewed commit` 一致；
- 合同要求的检查均通过，未执行项和限制已如实记录；
- 没有未解决的阻塞审查意见；
- 人类尚未作出的裁决没有被 Agent 代替。

Issue 评论中的计划审查属于 **Issue Review**；针对实际 diff 和验证证据的审查属于 **PR Review**。旧 Issue 中的 `[REVIEW]` 可以被引用为背景，但不能自动充当当前代码的 PR Review。

GitHub 的 Approval 与文本 `[REVIEW] PASS` 是两种不同证据。只有具有仓库审核资格、且不受 GitHub 自审限制影响的用户提交的正式 approval，才可能满足 GitHub 的“required approving reviews”。

## 4. 统一验证入口与 CI 一致性

### 4.1 目标契约

本地 Worker 与 GitHub Actions 必须调用同一个仓库入口：

```sh
./scripts/verify.sh
```

该脚本未来至少应按固定顺序覆盖：

| 检查 | 目标 | 初期门禁 |
| --- | --- | --- |
| Test | 单元测试和核心业务规则 | 必须通过 |
| Typecheck | Host、Client 及必要测试类型 | 必须通过 |
| Build | 编译、Typert 生成、Host/Client bundle | 必须通过 |
| Bundle consistency | 重新生成后，入库 bundle 与源码一致且文件完整 | 必须通过 |
| Packaging | manifest、patch、入口、依赖和发布文件完整 | 必须通过 |
| Smoke/Desktop | 实际 DSH 加载、Remote、浏览器和 Desktop 安装 | 初期可以人工或使用专用环境，但必须如实报告 |

GitHub Actions 不应复制一套不同命令；workflow 只准备环境并调用 `./scripts/verify.sh`。验证规则变更必须先改统一入口，再由本地和 CI 同时消费。

若生成的 bundle 入库，验证必须重新生成并检查工作树没有未提交差异，同时核对 Git 实际跟踪的运行期文件；只看到构建命令退出 0 不足以证明 bundle 与源码一致。`dsh.bundle`/patch、`cordis.patch.yml`、Typert schema、Host/Client 入口及 locale 等分发文件按当时实际包结构检查。

### 4.2 当前仓库事实（建立 v1.0 时）

截至 `main@1cb3fbc`：

- 仓库不存在 `scripts/verify.sh`；
- 仓库不存在 `.github/workflows/`；
- `package.json` 只定义 `bundle` 和 `watch`，没有 `test`、`typecheck` 或 `verify` script；
- `bundle` 命令依赖 DSH harness 中的 workspace 包和 `../../../scripts/generate-typert.ts`；
- `docs/HANDOFF.md` 记录了 harness 环境中的测试、类型、构建、lint、覆盖率和 Desktop 验收命令，但其中包含环境专用路径与限制。

因此，本节是必须另行实现并验证的目标约束，不代表 CI 或统一脚本已经存在。实现它必须使用独立 Issue Contract，先解决 runner 上的 DSH workspace/Typert 依赖和可移植路径，再把真实成功运行的 job 设为必需检查。不得直接把 HANDOFF 的个人路径复制进 CI，也不得为制造绿灯跳过测试或 bundle 核对。

初期建议只暴露一个稳定的 CI job 名 `verify`。不要给整个 required workflow 使用 `paths` 过滤，否则被过滤而未运行的必需检查可能保持 Pending。需要按文件类型减少工作量时，在实际启动的 job 内选择检查，但仍要产生明确的门禁结论。

## 5. 审查分级

所有变更都走 PR，但审查成本按风险分级：

| PR 类型 | 验证 | Critic Review | 最终合入 |
| --- | --- | --- | --- |
| 功能开发 | 完整 | 必须 | 人工决定 |
| Bug 修复 | 完整 | 必须 | 人工决定 |
| 代码重构 | 完整 | 必须 | 人工决定 |
| 普通说明文档、拼写 | 基础文档检查 | 可跳过 | 人工快速决定 |
| 架构、业务、接口、流程、Agent 规范文档 | 基础检查 + 语义核对 | 必须 | 人工决定 |
| CI、构建、依赖、bundle | 完整 | 必须 | 人工决定 |

不能仅按 `.md` 后缀把文档归为低风险。改变安装命令、业务规则、API 契约、验收标准或 Agent 权限的文档都需要 Critic。

跳过 Critic 时，PR 必须说明为什么属于低风险文档；这不等于允许自动合入。

## 7. Agent 工作边界与并行工作

| 角色 | 职责 | 不得做的事 |
| --- | --- | --- |
| 人类/仓库所有者 | 批准 Issue Contract、裁决歧义、设置优先级、接受风险、决定是否合入 | 不把未验证的 Agent 自述当作独立证据 |
| Orchestrator | 拆分任务、确认依赖、分配 Worker/Critic、核对交付条件与 SHA | 不越过人类裁决，不把同一 Agent 的自述包装成独立审查 |
| Worker | 只在任务分支实现 Contract、提交小而清楚的变更、运行可行验证、创建/更新 PR、报告限制 | 不直接推送 `main`，不自行合并，不放宽门禁，不扩大范围，不伪造已运行证据 |
| Critic | 独立阅读 Issue Contract、PR diff 和原始验证证据；检查规格偏差、风险和回退；把结论绑定到准确 SHA | 不因 Worker 声称 PASS 就跳过核实，不审查自己的未经隔离实现，不用旧 SHA 的 PASS 覆盖新提交 |

Agent 使用的 GitHub 凭据如果拥有完整仓库权限，文字规则本身不能形成真正的权限隔离。后续需要更强保证时，应使用独立身份、最小权限凭据或将 Critic 结果发布为绑定最新 SHA 的 GitHub Check。

### 7.1 Worktree 规则

并行任务使用独立 Git Worktree，而不是让多个 Worker 共享同一个检出：

```text
dsh-downloader/
├── main-worktree/       # main：规划与稳定基线
├── worktree-123/        # feat/123-rss-parser
└── worktree-124/        # fix/124-dedup
```

- 每个 Worktree 只绑定一个任务分支和一个 Worker 写边界。
- 规划、Issue Review 和只读核对可以继续在 `main` 工作树进行；不得在那里写任务实现。
- 并行开发不代表并行合入。多个 PR 修改同一模块时，后合入者必须基于最新 `main` 处理冲突、重跑验证，并重新取得绑定新 SHA 的 Review。
- 不要把另一个 Worktree 的未提交文件、依赖目录或生成物复制来制造通过结果。
- 删除 Worktree 或分支前，确认提交已推送、PR 状态明确且没有需要保留的未提交工作。

## 9. v1 落地优先级

按以下顺序推进，每一步都以实际证据为准：

1. 将本规范通过 Issue #12 的短分支和 PR 入库。
2. 按 [Issue #13](https://github.com/aaeviru/dsh-downloader/issues/13) 记录并冻结迁移基线，不重写历史。
3. 另开 Issue/PR，基于真实 DSH 构建环境实现 `scripts/verify.sh`、CI 和 PR 模板。
4. 确认 GitHub 上 `verify` job 实际运行成功后，由仓库所有者逐项启用 `main` 保护。
5. 选择下一项真实功能演练完整流程：Issue Contract → Worker → Draft PR → verify → Critic → 人工决定。
6. 稳定后再考虑 Critic Check、覆盖率阈值、Merge Queue 或 Release 自动化。

v1 暂不引入长期发布分支、自动 Approval、自动合并、复杂 Release 流程或仅为展示而增加的 Agent 层级。

## 附录：Ready for Merge 检查表

- [ ] PR 范围与已批准的 Issue Contract 一致。
- [ ] PR 只包含相关变更，目标分支为 `main`。
- [ ] 统一验证入口已通过；若尚未落地或环境受限，PR 明确列出 `NOT RUN`，不得声称 Ready。
- [ ] 需要 Critic 的 PR 已有绑定当前 PR HEAD SHA 的有效结论。
- [ ] 所有阻塞评论已解决，风险和回退方式已记录。
- [ ] bundle/生成物要求与本次源码一致，未混入 harness 或 lockfile 污染。
- [ ] 关联 Issue 使用正确的关闭或非关闭引用。
- [ ] 只有人类明确决定后才执行合入。
