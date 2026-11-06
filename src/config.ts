/** Downloader mount settings shared by the plugin entry and the Remote service. */
import z from '@deepseek-ai/schemastery'

/** Resolved downloader settings after defaults are applied. */
export interface Config {
  /** aria2 JSON-RPC endpoint URL. */
  endpoint: string
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
export const Config: z<Partial<Config>, Config> = z.object({
  endpoint: z.string().default('http://10.0.0.7:8082/jsonrpc'),
  tokenRef: z.string().default('ARIA2_TOKEN'),
  timeoutMs: z.number().min(1).default(15000),
  storePath: z.string().default('downloader/submissions.json'),
  feedUrl: z.string().default('https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2'),
})
