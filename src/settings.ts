import { QUALITY_FILTERS, SUKEBEI_CODES, SUKEBEI_CATEGORIES } from './catalog.ts'
import type { CategoryOption, EffectiveSettings, SourceKind } from './catalog.ts'
import { Aria2AuthError, Aria2TimeoutError, Aria2ProtocolError } from './aria2.ts'

export type { EffectiveSettings } from './catalog.ts'

/** Identify a feed provider by hostname; malformed URLs are unknown. */
export function sourceKind(feedUrl: string): SourceKind {
  try {
    const hostname = new URL(feedUrl).hostname
    if (hostname === 'sukebei.nyaa.si') return 'sukebei'
    if (hostname === 'nyaa.si') return 'nyaa'
  } catch { return 'unknown' }
  return 'unknown'
}

/** Return category choices only for supported Sukebei feeds. */
export function categoriesFor(kind: SourceKind): readonly CategoryOption[] {
  return kind === 'sukebei' ? SUKEBEI_CATEGORIES : []
}

/** Validate an HTTP(S) endpoint without userinfo, matching the Config pattern. */
export function isValidEndpoint(value: string): boolean {
  return /^https?:\/\/[^@/?#\s]+(?:\/[^\s]*)?$/.test(value)
}

/** Resolve explicit valid filters, then legacy URL values, then defaults. */
export function resolveSettings(input: {
  readonly endpoint: string
  readonly feedUrl: string
  readonly qualityFilter?: string
  readonly category?: string
}): EffectiveSettings {
  let params = new URLSearchParams()
  try { params = new URL(input.feedUrl).searchParams } catch { /* Invalid feeds have no legacy defaults. */ }
  return {
    endpoint: input.endpoint,
    qualityFilter: QUALITY_FILTERS.find(value => value === input.qualityFilter)
      ?? QUALITY_FILTERS.find(value => value === params.get('f')) ?? '2',
    category: SUKEBEI_CODES.find(value => value === input.category)
      ?? SUKEBEI_CODES.find(value => value === params.get('c')) ?? '0_0',
  }
}

/** Build a request with at most one q/f/c and provider-appropriate filters. */
export function buildFeedUrl(feedUrl: string, kind: SourceKind, settings: EffectiveSettings, keyword?: string): string {
  const url = new URL(feedUrl)
  const query = keyword !== undefined && keyword.trim() !== '' ? keyword : url.searchParams.get('q')
  if (query !== null) url.searchParams.set('q', query)
  if (kind === 'sukebei') url.searchParams.set('f', settings.qualityFilter)
  else url.searchParams.delete('f')
  if (kind === 'sukebei') url.searchParams.set('c', settings.category)
  else url.searchParams.delete('c')
  return url.toString()
}

/** Classify connection failures without exposing server diagnostics or secrets. */
export function classifyConnectionFailure(error: unknown): 'auth' | 'timeout' | 'unreachable' | 'protocol' {
  if (error instanceof Aria2AuthError) return 'auth'
  if (error instanceof Aria2TimeoutError) return 'timeout'
  if (error instanceof Aria2ProtocolError) return 'protocol'
  return 'unreachable'
}
