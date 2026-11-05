import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { FeedFetchError, createRssSource } from '../src/source.ts'
import type { FeedResponse } from '../src/source.ts'

const xml = readFileSync(join(import.meta.dirname, 'fixtures', 'nyaa.xml'), 'utf8')
const feedBase = 'https://feeds.example.test/feed/magnet'
const responding = (body: string, status = 200): FeedResponse => ({
  ok: status >= 200 && status < 300, status, text: async () => body,
})

afterEach(() => { vi.unstubAllGlobals() })

it('requests the page with its limit and returns deduplicated candidates', async () => {
  const seen: string[] = []
  const source = createRssSource({
    feedBase, page: 2, limit: 50, timeoutMs: 1000,
    transport: async url => { seen.push(url); return responding(xml) },
  })
  const candidates = await source.listCandidates()
  expect(seen).toEqual(['https://feeds.example.test/feed/magnet/p/2?limit=50'])
  expect(candidates).toHaveLength(5)
  expect(candidates[0]?.sourceId).toBe('feeds.example.test')
})

it('adds the search keyword as the q parameter', async () => {
  const seen: string[] = []
  const source = createRssSource({
    feedBase, page: 1, limit: 100, keyword: 'hello world', timeoutMs: 1000,
    transport: async url => { seen.push(url); return responding(xml) },
  })
  await source.listCandidates()
  expect(seen[0]).toBe('https://feeds.example.test/feed/magnet/p/1?limit=100&q=hello+world')
})

it('omits an empty keyword', async () => {
  const seen: string[] = []
  const source = createRssSource({
    feedBase, page: 1, limit: 10, keyword: '   ', timeoutMs: 1000,
    transport: async url => { seen.push(url); return responding(xml) },
  })
  await source.listCandidates()
  expect(seen[0]).not.toContain('q=')
})

it('rejects a non-2xx response with its status', async () => {
  const source = createRssSource({ feedBase, page: 1, limit: 10, timeoutMs: 1000, transport: async () => responding('', 503) })
  await expect(source.listCandidates()).rejects.toBeInstanceOf(FeedFetchError)
  await expect(source.listCandidates()).rejects.toMatchObject({ status: 503 })
})

it('propagates a parse failure for a body that is not XML', async () => {
  const source = createRssSource({ feedBase, page: 1, limit: 10, timeoutMs: 1000, transport: async () => responding('not xml at all') })
  await expect(source.listCandidates()).rejects.toMatchObject({ code: 'not-xml' })
})

it('aborts the request once the timeout elapses', async () => {
  let aborted = false
  const source = createRssSource({
    feedBase, page: 1, limit: 10, timeoutMs: 10,
    transport: (_url, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) })
    }),
  })
  await expect(source.listCandidates()).rejects.toThrow('aborted')
  expect(aborted).toBe(true)
})

it('falls back to global fetch when no transport is supplied', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => responding(xml)))
  const source = createRssSource({ feedBase, page: 1, limit: 10, timeoutMs: 1000 })
  await expect(source.listCandidates()).resolves.toHaveLength(5)
})
