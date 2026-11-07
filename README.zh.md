---
description: "实验性 aria2 下载器：RSS 候选发现、经 JSON-RPC 的受控提交，以及浏览器状态面板。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-downloader

[English](README.md) | 中文

## 概述

在配置好的 RSS 源里搜索下载候选，用解析出的凭证把某一个候选提交给 aria2 JSON-RPC 端点，并回报下载状态。宿主侧提供三个工具和一个 `download` Remote 命名空间；浏览器面板列出候选、按列排序并显示提交结果。候选按 info hash 去重，提交记录写到 harness home 下原子写入的 JSON 文件。aria2 鉴权失败、源不可达、候选 ID 不存在都会以明确的失败返回，而不是静默降级。

## 目录

- [使用本包](#use-this-package)
- [安装到 profile](#install-into-a-profile)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

挂载到同时提供 `tools`、`credentials` 和 `typert` 的宿主组合里。所有设置都有默认值，所以空的 `config` 映射也合法；`tokenRef` 指定端点期望的凭证名，token 本身不会出现在配置、日志或提交记录中。

```yaml
- id: downloader
  name: '@deepseek-ai/dsh-experimental-downloader'
  config:
    endpoint: http://10.0.0.7:8082/jsonrpc
    tokenRef: ARIA2_TOKEN
```

搜索和刷新只发现候选，绝不提交下载。刷新仅请求一次最后执行的查询，返回 `candidates`、`discovered`、`known` 和 `unsubmittable`；失败时保留先前的候选和提交记录。面板刷新时忽略尚未执行的搜索草稿。点击未提交的候选行或调用 `download_add` 才会下载；工具重复提交返回已记录的 GID。有宿主提交记录的行按 `dedupeKey` 匹配，显示绿色背景、已提交标签和 GID，翻页、搜索、重新挂载和刷新后仍然有效。点击已提交行只会选中它。选中行的标题旁提供可通过键盘操作的重新下载按钮，操作进行时禁用。显式重新下载仅在成功后替换存储的 GID；失败时保留原记录并显示错误。Remote 命名空间提供 `submissions()` 和 `resubmit(candidateId)`；重新提交先查找最近发现的候选，未找到时请求源一次，仍不存在的 ID 会被拒绝。工具不提供强制提交模式。

面板是可选的：它消费 `download` 命名空间，在 `sidebar.panellist` 占一个图标，并在 `main` 增加一个页面。

-----

<a id="install-into-a-profile"></a>
## 安装到 profile

本包以 DSH bundle 形式安装，只支持 DSH `0.2.2-rc.1`；`engines.dsh` 会拒绝其他版本。从内置模板建一个 Web profile，安装 bundle 目录或其打包出的 tarball，然后启动：

```sh
dsh --profile demo --from-default-profile web
dsh plugin --profile demo add ./bundle
dsh --profile demo
```

profile 自己的 `cordis.patch.yml` 可以按 id 覆盖任意行。补丁替换整份 `config`，所以要把该行需要的键全部重述：

```yaml
- id: downloader
  config:
    endpoint: http://10.0.0.7:8082/jsonrpc
    tokenRef: ARIA2_TOKEN
    timeoutMs: 15000
    storePath: downloader/submissions.json
    feedUrl: https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2
```

`dsh plugin --profile demo remove @deepseek-ai/dsh-experimental-downloader` 会移除该层并保留 `$DSH_HOME/downloader/submissions.json`。如果某个 DSH 检出仍把本包挂在 `packages/` 下，包名会先解析到那份源码，请把 bundle 装到没有该挂载的宿主。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

| 文件 | 职责 |
| --- | --- |
| `src/config.ts` | `Config` schema 与默认值，插件入口和 Remote 服务共用 |
| `src/index.ts` | 插件入口：`name`、`inject`、`apply`，以及经 `ctx.effect` 的工具注册 |
| `src/aria2.ts` | JSON-RPC 传输、版本与状态调用、带类型的失败 |
| `src/source.ts` | 基于配置源的 RSS 源，按关键词重新划定 |
| `src/rss.ts` | Feed 解析、`nyaa:size` 处理与 enclosure 兜底 |
| `src/candidate.ts` | 候选归一化与 info-hash 去重 |
| `src/coordinator.ts` | 提交与提交存储的契约 |
| `src/store.ts` | 注入式后端之上的持久提交存储 |
| `src/store-json.ts` | 原子写入的 `0600` JSON 后端 |
| `src/poller.ts` | 注入计时器的下载状态轮询 |
| `src/service.ts` | 工具与 Remote 方法共用的服务 |
| `src/remote.ts` | `DownloadRemote`：基于 Typert Remote 的 `download` 命名空间 |
| `src/client/` | 面板、图标、本地化文案与浏览器挂载 |

RSS 的字节数优先取 `nyaa:size`；没有时用 torrent enclosure 里纯数字的 `length`（包含 0）。缺失或非数字的长度保持未知。旧式 magnet feed 保留 torrent enclosure URL，缺失的 swarm 统计保持未知。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [`docs/HANDOFF.md`](docs/HANDOFF.md) —— 仓库接线、门禁命令与协作协议。
- [`@deepseek-ai/dsh-typert-protocol`](../../typert/protocol/README.zh.md) —— Remote 服务基类及其结果类型。

-----

<a id="model-experience"></a>
## 模型体验

### 下载工具与结果

#### 模型看到什么

插件暴露 `download_search`（关键词）、`download_add`（缓存的候选 ID）和 `download_status`（下载 GID），声明与输出定义在 [tools.ts](src/tools.ts)。搜索返回候选 ID、标题、是否可提交、大小和 info hash；提交返回结果、GID、时间戳与调用 ID；状态返回 GID 与状态。渲染摘要分别是 `Found {count} candidates.`、`Download submission: {outcome}.` 和 `Download status: {state}.`。插件不追加任何系统提示词文本。

#### Token 影响

三个工具声明在被暴露期间带来固定的请求开销。工具调用与结果追加进历史；搜索输出随返回候选的数量与标题长度增长，插件侧不设结果上限。提交与状态返回固定字段集合，只是取值长度可变。

#### KV Cache 影响

工具声明不变时请求前缀保持稳定。工具调用与结果追加进历史；候选、时间戳、提交结果或下载状态变化，都会改变新增的结果 token。启用或禁用插件会改变暴露的工具声明，可能使前缀复用失效；provider 侧是否命中缓存不由此插件决定。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **默认产品不含本包。** 通过 profile bundle 安装，或用测试 overlay 挂载源码；随产品发布的 Web 组合不包含它。
- **构建需要 DSH 检出。** Typert 生成只在 workspace 内识别协议包，所以 `scripts/build-bundle.sh` 通过 `$DSH_CHECKOUT` 构建；不依赖检出的构建在 #11 中仍标为 `NOT_VERIFIED`。
- **发现范围就是源本身。** 关键词搜索只是重新划定配置的 RSS 源，没有独立搜索索引，因此关键词只能找到该源当前提供的内容。
- **每个 profile 一个存储文件。** 提交记录追加到单个 JSON 文件；两个 harness 进程写同一 profile 时既无锁也无事务协调。
- **aria2 token 来自外部。** 端点缺少匹配 `tokenRef` 的凭证时返回 aria2 错误码 1，本包以 `Aria2AuthError` 显式失败，不重试。
- **旧式 magnet feed 丢失 swarm 统计。** 这类 feed 保留 torrent enclosure URL，seeders、leechers、downloads 保持未知，而不是默认成 0。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

本包在 `aaeviru/dsh-downloader` 开发，以 `packages/experimental/dsh-downloader` 进入 harness 检出目录。依赖只能在 harness 根目录解析（`pnpm install --filter dsh-downloader`），由此产生的 `pnpm-lock.yaml` importer 行永远不要提交——CI 上没有这个目录。[`docs/HANDOFF.md`](docs/HANDOFF.md) 记录了接线方式、门禁命令与 issue 优先的协作协议。

</details>
