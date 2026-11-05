import type { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it, vi } from 'vitest'
import { DownloadRemote, feedSource } from '../src/remote.ts'
import { createDownloadService } from '../src/service.ts'
import { createPersistentSubmitStore } from '../src/store.ts'

vi.mock('../src/service.ts', { spy: true })
vi.mock('../src/store.ts', { spy: true })
afterEach(() => { vi.restoreAllMocks() })

it('registers the download namespace and delegates every method to the shared service after hydration', async () => {
  const flush = vi.fn(async () => {})
  vi.mocked(createPersistentSubmitStore).mockResolvedValue({
    has: () => false, list: () => [], record: () => {}, flush,
  })
  const service = {
    search: vi.fn(async (_keyword: string) => []),
    listCandidates: vi.fn(async () => []),
    add: vi.fn(async (_id: string) => ({ gid: 'gid' })),
    status: vi.fn(async (_gid: string) => ({ state: 'active' })),
    refresh: vi.fn(async () => ({ discovered: 0, added: 0, skipped: 0, unsubmittable: 0 })),
  }
  const shared = service
  vi.mocked(createDownloadService).mockReturnValue(shared)
  const effects: Promise<() => void | Promise<void>>[] = []
  const provide = vi.fn()
  const ctx = {
    reflect: { provide }, credentials: { resolve: vi.fn() },
    effect(callback: () => (() => void | Promise<void>) | Promise<() => void | Promise<void>>) {
      effects.push(Promise.resolve(callback()))
    },
  }
  const remote = new DownloadRemote(ctx as Context, DownloadRemote.Config({}))
  expect(DownloadRemote.inject).toEqual(['typert', 'credentials'])
  expect(provide).toHaveBeenCalledWith('download', remote, undefined)
  expect(remote.typertRemote.namespace).toBe('download')
  expect(await remote.search('term', 2)).toEqual([])
  expect(await remote.list(3)).toEqual([])
  expect(await remote.add('candidate')).toEqual({ gid: 'gid' })
  expect(await remote.status('gid')).toEqual({ state: 'active' })
  expect(await remote.refresh()).toEqual(await shared.refresh.mock.results[0]!.value)
  expect(shared.search).toHaveBeenCalledWith('term', 2)
  expect(shared.listCandidates).toHaveBeenCalledOnce()
  expect(shared.add).toHaveBeenCalledWith('candidate')
  expect(shared.status).toHaveBeenCalledWith('gid')
  expect(shared.refresh).toHaveBeenCalledOnce()
  for (const effect of effects) await (await effect)()
  expect(flush).toHaveBeenCalledOnce()
})

it('builds a page-scoped feed source', async () => {
  const seen: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    seen.push(url)
    return { ok: true, status: 200, text: async () => '<rss><channel></channel></rss>' }
  }))
  try {
    await feedSource({ feedBase: 'https://feeds.example.test/feed/magnet', pageSize: 25, timeoutMs: 1000 })('query', 4).listCandidates()
  } finally {
    vi.unstubAllGlobals()
  }
  expect(seen[0]).toBe('https://feeds.example.test/feed/magnet/p/4?limit=25&q=query')
})
