# Phase 4 任务书 — Web UI、浏览器验收与 Desktop 安装

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) Phase 4。

## Problem Statement

前三个阶段的产物在 Host 里，「能用」的标准是用户在侧栏点开、看到候选、点提交、看到 GID 与状态；并且这套东西要能作为 bundle 装进 Desktop profile，而不只是源码 `--patch` 跑得起来。

## Solution

按 [dsh-plugin-docs](https://github.com/aaeviru/dsh-plugin-docs) 已验证的形状补客户端半边：`src/client/index.ts`（无 JSX）注册 `main` 与 `sidebar.panellist`，JSX 放 `.tsx`，文案进 locale 八语言，用 overlay 加载验证，最后走 bundle 安装。

## Implementation Decisions

- 客户端入口必须是 `src/client/index.ts`（打包预设的入口字面量固定），JSX 拆到 `HelloDownloaderPage.tsx` 之类的独立文件。
- 两个座位成套注册：`main`（页面）+ `sidebar.panellist`（图标），通过 `ctx.slots.inject(...)`，**不要**直接 `slots.register` 到未声明座位。
- 数据全部来自 Host（`download_search` / 候选列表 / 状态），Client 不持有 aria2 地址与 token。
- 文案走 typed locale 字典，补齐八语言；不加硬编码中文/英文。
- 开发加载用 `apps/web/tests/hello-page.overlay.yml` 同形状的 overlay：`- insert: [{ id: downloader, name: 'dsh-downloader' }]`。
- 安装形态另建 `cordis.patch.yml`（`name` 用包名）与 bundle 目录，**不要**替换源码形态的 `cordis.source.patch.yml`。

## Testing Decisions

- 组件测试：给候选列表、空列表、加载中、错误四种状态，断言用户可见文案与可用按钮；不测 class 名。
- 浏览器实测：`pnpm dsh web --patch apps/web/tests/downloader.overlay.yml`，确认侧栏出现图标、点开有页面、提交后显示 GID。
- 安装验收：按 12 篇流程 `plugin_manager install_bundle`，`application: applied` + `warnings: []`，并确认侧栏与主面板都出现。

## Out of Scope

精美 UI、媒体库整理、播放、自动重命名。

## 验证命令

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
pnpm dsh web --patch apps/web/tests/downloader.overlay.yml   # 人工：浏览器验收
```

## 硬约束

不改 `scripts/`、`packages/bundle/`（安装走 `plugin_manager`，不手写 profile `package.json`）；不用硬编码颜色/文案；不 import 其他插件的值；实验包只能靠 overlay 加载，不改正式 composition。

跟踪 issue：[#7](https://github.com/aaeviru/dsh-downloader/issues/7)
