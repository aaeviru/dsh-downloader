/** Downloader mount settings shared by the plugin entry and the Remote service. */
import type { Volatile } from '@deepseek-ai/cordis'
import { QUALITY_FILTERS, CATEGORY_CODES } from './catalog.ts'
import type { QualityFilter, CategoryCode } from './catalog.ts'
import z from '@deepseek-ai/schemastery'

/** Resolved downloader settings after defaults are applied. */
export interface Config {
  /** aria2 JSON-RPC endpoint URL. */
  endpoint: Volatile<string>
  /** Live quality filter; unset inherits the feed URL. */
  qualityFilter: Volatile<QualityFilter | undefined>
  /** Live category; unset inherits the feed URL. */
  category: Volatile<CategoryCode | undefined>
  /** Credential reference resolved for aria2 authentication. */
  tokenRef: string
  /** Request timeout in milliseconds; must be at least one. */
  timeoutMs: number
  /** Submission store file, absolute or relative to the harness home. */
  storePath: string
  /** RSS feed URL used for candidate discovery and keyword searches. */
  feedUrl: string
}

/** Parse mount settings and supply defaults for omitted fields. */
export const Config = z.object({
  endpoint: z.string().pattern(/^https?:\/\/[^@/?#\s]+(?:\/[^\s]*)?$/).default('http://10.0.0.7:8082/jsonrpc').volatile(),
  qualityFilter: z.union(QUALITY_FILTERS).volatile(),
  category: z.union(CATEGORY_CODES).volatile(),
  tokenRef: z.string().default('ARIA2_TOKEN'),
  timeoutMs: z.number().min(1).default(15000),
  storePath: z.string().default('downloader/submissions.json'),
  feedUrl: z.string().default('https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2'),
})
