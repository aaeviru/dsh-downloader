import { dedupeCandidates } from './candidate.ts'
import type { Candidate } from './candidate.ts'
import { parseRssFeed } from './rss.ts'
import type { Source } from './coordinator.ts'

/** One HTTP response as the RSS source consumes it. */
export interface FeedResponse {
  readonly ok: boolean
  readonly status: number
  text(): Promise<string>
}

/** Fetch seam; the default implementation wraps global `fetch`. */
export type FeedTransport = (url: string, signal: AbortSignal) => Promise<FeedResponse>

/** A feed that could not be retrieved. */
export class FeedFetchError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Feed request failed with status ${status}`)
    this.name = 'FeedFetchError'
    this.status = status
  }
}

export interface RssSourceOptions {
  readonly feedUrl: string
  /** Feed search term; omitted keeps the address as configured. */
  readonly keyword?: string
  readonly timeoutMs: number
  readonly transport?: FeedTransport
}

const defaultTransport: FeedTransport = (url, signal) => fetch(url, { signal })

/**
 * Build a candidate source over one RSS feed.
 * @param options - feed address, request timeout, and an optional transport override.
 * @returns a source that fetches the feed and returns normalized, deduplicated candidates.
 */
export function createRssSource(options: RssSourceOptions): Source {
  const transport = options.transport ?? defaultTransport
  const sourceId = new URL(options.feedUrl).host
  const requestUrl = (): string => {
    if (options.keyword === undefined || options.keyword.trim() === '') return options.feedUrl
    const url = new URL(options.feedUrl)
    url.searchParams.set('q', options.keyword)
    return url.toString()
  }
  return {
    async listCandidates(): Promise<readonly Candidate[]> {
      const controller = new AbortController()
      const timer = setTimeout(() => { controller.abort() }, options.timeoutMs)
      try {
        const response = await transport(requestUrl(), controller.signal)
        if (!response.ok) throw new FeedFetchError(response.status)
        return dedupeCandidates(parseRssFeed(await response.text(), { sourceId }))
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
