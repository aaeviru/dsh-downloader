import { XMLParser } from 'fast-xml-parser'
import { SyntaxValidator } from 'fast-xml-validator'
import { dedupeCandidates, normalizeInfoHash } from './candidate.ts'
import type { Candidate } from './candidate.ts'

export class RssParseError extends Error {
  readonly code: 'not-xml' | 'no-channel'

  constructor(code: 'not-xml' | 'no-channel', options?: ErrorOptions) {
    super(code, options)
    this.name = 'RssParseError'
    this.code = code
  }
}

function field(value: unknown, key: string): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return (value as Record<string, unknown>)[key]
  }
  return undefined
}

function text(value: unknown): string | null {
  const content = typeof value === 'string' ? value : field(value, '#text')
  return typeof content === 'string' && content !== '' ? content : null
}

function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [value]
}

function size(value: string | null): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(b|kib|mib|gib|tib)$/i.exec(value ?? '')
  if (!match) return null
  const amount = Number(match[1])
  const unit = String(match[2]).toLowerCase()
  const bytes = Math.round(amount * 1024 ** ['b', 'kib', 'mib', 'gib', 'tib'].indexOf(unit))
  return Number.isFinite(bytes) ? bytes : null
}

function date(value: string | null): string | null {
  const timestamp = Date.parse(value ?? '')
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

function candidate(item: unknown, sourceId: string): Candidate | null {
  const links = list(field(item, 'link'))
  const alternate = links.find(link => field(link, '@_rel') === 'alternate')
  const link = text(field(item, 'link')) ?? text(field(alternate, '@_href'))
  const sourceUrl = link ?? text(field(item, 'guid')) ?? text(field(item, 'id'))
  if (sourceUrl === null) return null
  const magnetUri = link?.startsWith('magnet:?') ? link : null
  const torrentUrl = [
    link,
    ...list(field(item, 'enclosure')).map(entry => text(field(entry, '@_url'))),
    ...links.filter(entry => field(entry, '@_rel') === 'enclosure').map(entry => text(field(entry, '@_href'))),
  ].find(url => url?.endsWith('.torrent')) ?? null
  const xt = new URLSearchParams((magnetUri ?? '').slice('magnet:?'.length)).getAll('xt')
  const magnetHash = xt.filter(value => /^urn:btih:/i.test(value))
    .map(value => normalizeInfoHash(value.slice(9))).find(value => value !== null) ?? null
  const infoHash = magnetHash ?? normalizeInfoHash(text(field(item, 'nyaa:infoHash')))
    ?? normalizeInfoHash(text(field(item, 'torrent:infoHash')))
  const dedupeKey = infoHash === null ? `url:${sourceUrl}` : `ih:${infoHash}`
  return {
    id: `${sourceId}:${dedupeKey}`,
    sourceId,
    title: text(field(item, 'title')) ?? '',
    publishedAt: date(text(field(item, 'pubDate')) ?? text(field(item, 'published')) ?? text(field(item, 'updated'))),
    infoHash,
    magnetUri,
    torrentUrl,
    sizeBytes: size(text(field(item, 'nyaa:size'))),
    sourceUrl,
    submittable: magnetUri !== null || torrentUrl !== null,
    dedupeKey,
  }
}

export function parseRssFeed(xml: string, options: { sourceId: string }): readonly Candidate[] {
  try {
    SyntaxValidator.validate(xml)
  } catch (cause) {
    throw new RssParseError('not-xml', { cause })
  }
  const root: unknown = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml)
  const atom = field(root, 'feed')
  const rdf = field(root, 'rdf:RDF')
  const channel = field(field(root, 'rss') ?? rdf, 'channel')
  if (atom === undefined && channel === undefined) throw new RssParseError('no-channel')
  const container = atom ?? rdf ?? channel
  const items = [...list(field(container, 'item')), ...list(field(container, 'entry'))]
  const candidates: Candidate[] = []
  for (const item of items) {
    const parsed = candidate(item, options.sourceId)
    if (parsed !== null) candidates.push(parsed)
  }
  return dedupeCandidates(candidates)
}
