import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { FeedFetchError, createRssSource } from '../src/source.ts'
import type { FeedResponse } from '../src/source.ts'

const xml = readFileSync(join(import.meta.dirname, 'fixtures', 'nyaa.xml'), 'utf8')
const feedUrl = 'https://feeds.example.test/rss'
const responding = (body: string, status = 200): FeedResponse => ({
  ok: status >= 200 && status < 300, status, text: async () => body,
})

it('parses the feed into candidates and deduplicates them', async () => {
  const source = createRssSource({ feedUrl, timeoutMs: 1000, transport: async () => responding(xml) })
  const candidates = await source.listCandidates()
  expect(candidates).toHaveLength(5)
  expect(candidates[0]?.sourceId).toBe('feeds.example.test')
  expect(new Set(candidates.map(candidate => candidate.dedupeKey)).size).toBe(candidates.length)
})

it('rejects a non-2xx response with its status', async () => {
  const source = createRssSource({ feedUrl, timeoutMs: 1000, transport: async () => responding('', 503) })
  await expect(source.listCandidates()).rejects.toBeInstanceOf(FeedFetchError)
  await expect(source.listCandidates()).rejects.toMatchObject({ status: 503 })
})

it('propagates a parse failure for a body that is not XML', async () => {
  const source = createRssSource({ feedUrl, timeoutMs: 1000, transport: async () => responding('not xml at all') })
  await expect(source.listCandidates()).rejects.toMatchObject({ code: 'not-xml' })
})

it('aborts the request once the timeout elapses', async () => {
  let aborted = false
  const source = createRssSource({
    feedUrl,
    timeoutMs: 10,
    transport: (_url, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) })
    }),
  })
  await expect(source.listCandidates()).rejects.toThrow('aborted')
  expect(aborted).toBe(true)
})

afterEach(() => { vi.unstubAllGlobals() })

it('falls back to global fetch when no transport is supplied', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => responding(xml)))
  const source = createRssSource({ feedUrl, timeoutMs: 1000 })
  await expect(source.listCandidates()).resolves.toHaveLength(5)
})
