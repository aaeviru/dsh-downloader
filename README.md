---
description: "Experimental aria2 downloader: RSS candidate discovery, guided submission over JSON-RPC, and a browser status panel."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-downloader

English | [中文](README.zh.md)

## Summary

Searches a configured RSS feed for download candidates, submits one candidate to an aria2 JSON-RPC endpoint with a resolved credential, and reports the download's state. The host exposes three tools and a `download` Remote namespace; a browser panel lists candidates, sorts columns, and shows submission results. Candidates deduplicate by info hash, and submissions persist to an atomically written JSON file under the harness home. Unauthenticated aria2, an unreachable feed, and unknown candidate IDs surface as explicit failures.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount it in a host composition that provides `tools`, `credentials`, and `typert`. Every setting has a default, so an empty `config` mapping is valid; `tokenRef` names the credential the endpoint expects, and the token itself never appears in configuration, logs, or the submission store.

```yaml
- id: downloader
  name: '@deepseek-ai/dsh-experimental-downloader'
  config:
    endpoint: http://10.0.0.7:8082/jsonrpc
    tokenRef: ARIA2_TOKEN
```

Search and refresh only discover candidates; they never submit downloads. Refresh fetches the last executed query once, returns `candidates`, `discovered`, `known`, and `unsubmittable`, and preserves the previous candidates and submission records on failure. The panel ignores unexecuted search drafts when refreshing. Submit an individual row or call `download_add` to download it; repeated submissions return the recorded GID.

The panel is optional: it consumes the `download` namespace, occupies the `sidebar.panellist` icon, and adds a page to `main`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Responsibility |
| --- | --- |
| `src/config.ts` | `Config` schema and its defaults, shared by the plugin entry and the Remote service |
| `src/index.ts` | Plugin entry: `name`, `inject`, `apply`, and tool registration through `ctx.effect` |
| `src/aria2.ts` | JSON-RPC transport, version and status calls, and typed failures |
| `src/source.ts` | RSS source over the configured feed, re-scoped per keyword |
| `src/rss.ts` | Feed parsing, `nyaa:size` handling, and enclosure fallbacks |
| `src/candidate.ts` | Candidate normalization and info-hash deduplication |
| `src/coordinator.ts` | Submission and the submit-store contract |
| `src/store.ts` | Persistent submit store over an injected backend |
| `src/store-json.ts` | Atomically written `0600` JSON backend |
| `src/poller.ts` | Download status polling with injected timers |
| `src/service.ts` | The service the tools and Remote methods share |
| `src/remote.ts` | `DownloadRemote`: the `download` namespace over Typert Remote |
| `src/client/` | Panel, icon, locale strings, and the browser mount |

RSS sizes use `nyaa:size` when present; otherwise a torrent enclosure's digits-only `length` supplies bytes, including zero. Missing or non-numeric lengths remain unknown. Legacy magnet feeds retain torrent enclosure URLs and leave absent swarm statistics unknown.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`docs/HANDOFF.md`](docs/HANDOFF.md) — repository wiring, gate commands, and the collaboration protocol.
- [`@deepseek-ai/dsh-typert-protocol`](../../typert/protocol/README.md) — the Remote service base and its result types.

-----

<a id="model-experience"></a>
## Model Experience

### Download tools and results

#### What the model sees

The plugin exposes `download_search` (keyword), `download_add` (cached candidate ID), and `download_status` (download GID), with declarations and outputs defined in [tools.ts](src/tools.ts). Search returns candidate IDs, titles, submission eligibility, sizes, and info hashes; submission returns its outcome, GID, timestamp, and call ID; status returns the GID and state. Rendered summaries are `Found {count} candidates.`, `Download submission: {outcome}.`, and `Download status: {state}.`. The plugin adds no system-prompt text.

#### Token effect

The three tool declarations add fixed request overhead while exposed. Tool calls and results add history tokens; search output grows with the number and title lengths of returned candidates, with no plugin-owned result cap. Submission and status return a fixed set of fields with variable-length values.

#### KV Cache effect

Unchanged tool declarations preserve a stable request prefix. Tool calls and results append to history; changing candidates, timestamps, submission outcomes, or download states changes the new result tokens. Enabling or disabling the plugin changes the exposed tool declarations and may invalidate prefix reuse; provider cache availability remains outside this plugin's control.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Not mounted by the default product.** The Web bundle refuses experimental packages by rule; this package loads through a test overlay or an explicit profile row.
- **Discovery is feed-scoped.** Keyword search re-scopes the configured RSS feed; there is no separate search index, so a keyword only finds what that feed currently serves.
- **One store file per profile.** Submissions append to a single JSON file; two harness processes writing the same profile coordinate through neither a lock nor a transaction.
- **The aria2 token is external.** An endpoint without a matching `tokenRef` credential answers with aria2 error code 1, which surfaces as `Aria2AuthError` instead of a retry.
- **Legacy magnet feeds lose swarm statistics.** Such feeds keep their torrent enclosure URLs, so seeders, leechers, and downloads stay unknown rather than defaulting to zero.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This package is developed in `aaeviru/dsh-downloader` and enters the harness checkout as `packages/experimental/dsh-downloader`. Dependencies resolve only from the harness root (`pnpm install --filter dsh-downloader`), and the resulting `pnpm-lock.yaml` importer line must never be committed because CI has no such directory. [`docs/HANDOFF.md`](docs/HANDOFF.md) records the wiring, the gate commands, and the issue-first collaboration protocol.

</details>
