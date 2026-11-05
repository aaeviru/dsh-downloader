# Phase 1a 补充规格 — fixture 清单与遗漏用例

本文件是 [`phase-1a.md`](phase-1a.md) 的补充，不是替代。任务书的行为规格仍然有效；这里只做三件事：登记验收方预先放好的 fixture、补齐测试清单漏掉的用例、把任务书里含糊的点定死。

所有补充用例都能从已批准的 `[CONTRACT v1]` 文本推出（字段映射表、`parseRssFeed` 的 JSDoc、`RssParseError.code` 联合类型），没有新增行为。

## 1. Fixture 清单

全部位于 `tests/fixtures/`，由验收方提供，执行者**只读不改**。

| 文件 | 来源 | 覆盖 | 期望 candidate 数 |
|---|---|---|---|
| `nyaa-real.xml` | 真实 sukebei feed，75 条中抽 6 条原文 | 真实结构：`nyaa:` 命名空间、CDATA + 内嵌 `<a>` 的 description、`&amp;` 实体、小数 MiB/GiB、`-0000` 时区、`?xml` 声明 | 6 |
| `nyaa.xml` | 合成，一条 item 一个分支 | B1 / B2 / B3 / B4 / B11 / B9+B10 | 5（B4 被丢弃） |
| `dupes.xml` | 合成 | B5（大小写不同的同 hash）、B6（同 sourceUrl） | 2 |
| `minimal.xml` | 合成 | 最小合法 RSS | 1 |
| `malformed.xml` | 合成 | B7 | 抛错 |
| `empty.xml` | 合成 | B8 | 0 |
| `no-channel.xml` | 合成 | B15 | 抛错 |
| `rdf.xml` | 合成 | B12（RSS 1.0） | 1（无 link 的那条被丢弃） |
| `atom.xml` | 合成 | B13（Atom） | 2 |

`nyaa-real.xml` 的 6 条覆盖：`1.7 GiB` / `965.9 MiB` / `645.2 MiB` 三种 size、标题里的 `&amp;`、以及全部 6 条都是 `<link>` 指向 `.torrent`（`nyaa:infoHash` + `<guid>` 详情页）。

## 2. 补充用例（任务书 10 条之外）

| ID | 用例 | 断言 |
|---|---|---|
| B11 | `<link>` 以 `.torrent` 结尾、且无 `<enclosure>`（`nyaa.xml` 第 5 条） | `torrentUrl` 为该 URL、`submittable: true`、`magnetUri: null` |
| B12 | RSS 1.0 / RDF（`rdf.xml`） | 根元素是 `rdf:RDF` 时仍能取到顶层 `item`；有 link 的 1 条被解析，无 link 的 1 条被丢弃 |
| B13 | Atom（`atom.xml`） | `entry` 被解析；`rel="enclosure"` 的 `href` → `torrentUrl`，`rel="alternate"` 的 `href` → `sourceUrl`；第二条 `alternate` 是 magnet → `magnetUri` + infoHash；`published`/`updated` → `publishedAt` |
| B14 | `nyaa-real.xml` 整体 | 6 条全部 `submittable: true`、`infoHash` 为 40 位小写 hex、`sizeBytes` 非 null；标题含 `&` 的那条 `title` 里是单个 `&` |
| B15 | 合法 XML 但无 `<channel>`（`no-channel.xml`） | 抛 `RssParseError`，`code === 'no-channel'` |
| B16 | Atom 的 `entry` 有 `<id>` 但无可用的 `<link>`（内联 XML） | 条目保留，`sourceUrl` 为该 id，`submittable: false` |

B11 的来源是字段映射表的 "`item/link`：以 `.torrent` 结尾 → `torrentUrl`" 一行——行为在合约里，测试清单漏了。B12/B13 的来源是 `parseRssFeed` 的 JSDoc（"RSS 2.0 与 RSS 1.0（RDF）的 item/entry"）。B15 的来源是 `RssParseError.code` 的联合类型，两个 code 都必须有用例。B16 的来源是 Atom 的 `<id>` 与 RSS `<guid>` 等价——兜底链漏了它，会让「有 id 无 link」的 Atom 条目被当成无来源丢弃。

## 3. 已定死的细节

任务书没写、但测试必须唯一确定的点：

1. **解析器配置**：`ignoreAttributes: false`。`<enclosure url>` 和 Atom `<link href>` 都是属性；不开这一项这两条路径无法实现。建议 `attributeNamePrefix` 留默认或统一，但 `<link>` 与 `<enclosure>` 的正文/属性两条路径都要取到。
2. **XML 声明不要当成根**：带 `<?xml ... ?>` 的文件解析后根对象里有 `?xml` 键。不要用 `Object.keys(root)[0]` 猜根元素；按 `rss` / `rdf:RDF` / `feed` 显式取。
3. **子节点可能是数组也可能是单值**：只有一个 `<item>` 时是对象，多个时是数组；Atom 的 `<link>` 同理。统一用 `Array.isArray` 归一化后再遍历。
4. **`sizeBytes` 换算**：1024 进制，接受 `B` / `KiB` / `MiB` / `GiB` / `TiB`（大小写不敏感，数字与单位之间空格可有可无），允许小数，结果四舍五入到整字节。`1.7 GiB` → `1825361101`。单位缺失或不认识 → `null`。
5. **magnet 解析**：从 `xt=urn:btih:<hash>` 取 hash，交给 `normalizeInfoHash`。`magnetUri` 原样保留（不重新编码），大写的 `btih` 也要认。
6. **`submittable`** 严格等于 `magnetUri !== null || torrentUrl !== null`。只有 infoHash 时必须是 `false`，**不得**用 infoHash 拼 magnet。
7. **`sourceUrl` 取值顺序**：`<link>` → `<guid>` → `<id>` → 都缺则丢弃该条。前两级是 RSS 的写法，`<id>` 是 Atom 里 `<guid>` 的等价物；RSS feed 没有 `<id>`，所以对 RSS 行为无影响。RDF 的 `rdf:about` 不作兜底（任务书没要求，`rdf.xml` 里无 link 的那条会被丢弃）。
8. **`publishedAt`**：RSS 走 RFC 822，Atom 走 ISO 8601；输出统一 `new Date(value).toISOString()`；解析失败或缺失 → `null`，不抛错。
9. **`id`**：`${sourceId}:${dedupeKey}`。`sourceId` 只来自 `options.sourceId`，不从 XML 里猜。
10. **去重**：按 `dedupeKey` 保留首次出现顺序，返回新数组，不改入参。

## 4. 依赖

`fast-xml-parser@5.11.1` 已由验收方装好（`node_modules/fast-xml-parser` 指向 harness pnpm store 的同一版本），并已写入 `package.json` 的 `dependencies`。执行者**不要**运行 `pnpm install`。
