# 待办：切换到旧版 feed（服务端翻页 + magnet）

站点自己的 RSS 说明在 `https://sukebei.cn.nyaa.net/rss`：

| | 现在用的 | 要换成的 |
|---|---|---|
| 地址 | `https://sukebei.nyaa.net/?page=rss` | `https://sukebei.nyaa.net/feed/magnet/p/{page}?limit=N` |
| 条数 | 固定 75，不能翻页 | `limit` 默认 50、上限 300 |
| `<link>` | `.torrent` 下载地址 | **magnet URI** |

换成 magnet 还能顺带消掉 `followedBy` 包装任务：提交的 gid 直接就是真实下载。

## 改动清单

1. `src/source.ts`：`createRssSource({ feedBase, page, limit, keyword?, timeoutMs, transport? })`，URL = `${feedBase}/p/${page}?limit=${limit}[&q=...]`，`sourceId` 取 feedBase 的 host。
2. `src/service.ts`：`listCandidates(page)` / `search(keyword, page)`，**每页都请求、不要缓存**；`refresh()` 仍委托协调器；`add(candidateId)` 对当前页找不到的候选，先抓一次第 1 页再抛 `UnknownCandidateError`（或保留只供 `add` 用的 last-page 缓存，二选一并注释说明）。
3. `src/remote.ts`：Config 换成 `feedBase`（默认 `https://sukebei.nyaa.net/feed/magnet`）+ `pageSize`（默认 100，1–300）；`@Remote('list') list(page)`、`@Remote('search') search(keyword, page)`。
4. 客户端：`namespace.ts` 与 `DownloaderPanel.tsx` 改服务端翻页（删掉本地切片）；保留网格、点行提交、滚动、排序、`‹ N ›`。
5. `download_search` 工具传 page 1。

## 必须同步改的测试

- `tests/source.spec.ts`：断言拼出的 URL（page / limit / `q` 编码）
- `tests/service.spec.ts`：B2/B3 改成「同页第二次仍会请求」「换页是不同的请求」
- `tests/index.spec.ts`：新 Config 默认值
- `tests/tools.spec.ts`：`download_search` 传 `(keyword, 1)`
- `tests/remote.spec.ts`：带 page 的委托
- `tests/downloader-panel.client.spec.tsx`：翻页触发 `list(2)`

## 验收

```sh
cd ~/projects/deepseek-harness
./node_modules/.bin/tsc -b packages/experimental/dsh-downloader
pnpm --filter @deepseek-ai/dsh-experimental-downloader run bundle
pnpm vitest run packages/experimental/dsh-downloader/tests/
```

覆盖率对 `src/**` 保持 100%（client 已从 node 覆盖中排除）。完成后按老流程重建 `bundle/` 并核对 `git ls-files bundle | wc -l` 与实际文件数。
