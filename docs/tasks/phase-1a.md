# Phase 1a 任务书 — RSS → Candidate 归一化（无网络 / 无 NAS / 无 UI）

关联：[issue #1](https://github.com/aaeviru/dsh-downloader/issues/1) 的 Phase 1 第 2、3 项。

## 目标

当前 `src/index.ts` 是空壳：包能构建、能安装，但**没有任何业务能力**。本阶段只做一件可离线验证的事：
把 RSS XML 解析成标准化的 `Candidate[]`，并给出稳定去重键。**不触发任何网络请求，不接触 NAS，不写 UI。**

## 涉及文件（全部新建或修改）

```
src/candidate.ts        Candidate 类型、InfoHash 归一化、去重
src/rss.ts              RSS XML → Candidate[]（fast-xml-parser）
tests/fixtures/nyaa.xml         真实结构样例（含 magnet / torrent / 无可用链接三类条目）
tests/fixtures/minimal.xml      只有 title + link 的最小 RSS
tests/fixtures/malformed.xml    非 XML 内容
tests/candidate.spec.ts
tests/rss.spec.ts
```

依赖 `fast-xml-parser`（workspace 已有 5.11.1）**由验收方安装**；执行者不要运行 `pnpm install`。

## 行为规格

### `src/candidate.ts`

```ts
export interface Candidate {
  readonly id: string              // 稳定 id：sourceId + ':' + dedupeKey
  readonly sourceId: string
  readonly title: string
  readonly publishedAt: string | null  // ISO 8601；无法解析时为 null，不得抛错
  readonly infoHash: string | null     // 小写 40 位 hex；无法确定为 null
  readonly magnetUri: string | null
  readonly torrentUrl: string | null
  readonly sizeBytes: number | null    // 无法解析为 null
  readonly sourceUrl: string           // 条目原始 link 或 guid
  readonly submittable: boolean        // magnetUri 或 torrentUrl 至少一个存在
  readonly dedupeKey: string           // infoHash 优先，否则 sourceUrl 的稳定键
}

/** 归一化 InfoHash：仅接受 40 位 hex（大小写不敏感）或 base32 转 hex；其余返回 null。 */
export function normalizeInfoHash(raw: string | null | undefined): string | null

/** 按 dedupeKey 去重，保留首次出现顺序。 */
export function dedupeCandidates(list: readonly Candidate[]): readonly Candidate[]
```

`dedupeKey` 规则：`ih:<归一化 infohash>` 优先；无 infohash 时用 `url:<sourceUrl>`。

### `src/rss.ts`

```ts
export class RssParseError extends Error {
  readonly code: 'not-xml' | 'no-channel'
}

/** 解析 RSS 2.0 与 RSS 1.0（RDF）的 item/entry；空 feed 返回 []，不抛错。 */
export function parseRssFeed(xml: string, options: { sourceId: string }): readonly Candidate[]
```

字段映射（**以实际 XML 为准，不假设 `<link>` 是 magnet**）：

| 来源 | 目标 |
|---|---|
| `item/title` | `title` |
| `item/link`：`magnet:?` 开头 | `magnetUri`（并从中提取 `xt=urn:btih:<hash>` → infoHash） |
| `item/link`：以 `.torrent` 结尾 | `torrentUrl` |
| `item/link` 其他 | 仅作 `sourceUrl`，不构造 magnet |
| `item/enclosure@url` | 若 `.torrent` 结尾则 `torrentUrl` |
| `item/guid` | `sourceUrl` 的兜底 |
| `nyaa:infoHash` / `torrent:infoHash` | `infoHash` |
| `nyaa:size`（如 `1.2 GiB`） | `sizeBytes`，按 1024 进制；无法解析为 null |
| `item/pubDate`（RFC 822） | `publishedAt` ISO 8601；无法解析为 null |

## 必须覆盖的测试（每一条一个用例）

1. magnet 在 `<link>` 中 → 提取出 infoHash 与 magnetUri。
2. `<link>` 是详情页、`<enclosure>` 是 .torrent → `torrentUrl` 有值、`submittable: true`。
3. 只有 `nyaa:infoHash`、无 magnet 无 torrent → `submittable: false`（**不得**构造 magnet）。
4. 缺 `<link>` 与 `<guid>` → 该条目被丢弃且不抛错。
5. 同一 feed 内两条相同 infoHash → 去重后剩 1 条。
6. 无 infoHash、sourceUrl 相同 → 去重后剩 1 条。
7. 非法 XML（fixtures/malformed.xml）→ 抛 `RssParseError`，`code === 'not-xml'`。
8. 空 channel → `[]`，不抛错。
9. `pubDate` 非法 → `publishedAt: null`。
10. `nyaa:size` 非法 → `sizeBytes: null`。

## 硬约束（违反即返工）

- **不要修改** `scripts/`、`packages/bundle/`、`tsconfig.client.json`、`pnpm-workspace.yaml`。
- **不要 import 任何 `@deepseek-ai/*` 的值**；类型导入用 `import type`。
- **不要运行** `git`、`pnpm install`、`pnpm run dev:web`，不要重启任何服务。
- **不要发起网络请求**；测试只读 `tests/fixtures/`。
- 不用 `any`、不用 `as unknown`；解析边界用显式校验。
- 覆盖率按文件 100%：每个 `if`/`??`/`catch` 分支都要有用例。
- 注释用英文，只写不显然的契约；不写实现叙述。

## 验证命令（执行者自检，验收方重跑）

```sh
cd /home/aaevi/projects/deepseek-harness
pnpm vitest run packages/experimental/dsh-downloader/tests/
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter dsh-downloader run bundle
```

## 报告格式

- 每条命令的**原始输出**与退出码，一字不改；失败就把第一条错误原文抄回来。
- 不要声称"已通过"而省略输出；沙箱挡住时如实说明是哪个命令被挡。
