import type { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it, vi } from 'vitest'
import { DownloadRemote } from '../src/remote.ts'
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
  expect(await remote.search('term')).toEqual([])
  expect(await remote.list()).toEqual([])
  expect(await remote.add('candidate')).toEqual({ gid: 'gid' })
  expect(await remote.status('gid')).toEqual({ state: 'active' })
  expect(await remote.refresh()).toEqual(await shared.refresh.mock.results[0]!.value)
  expect(shared.search).toHaveBeenCalledWith('term')
  expect(shared.listCandidates).toHaveBeenCalledOnce()
  expect(shared.add).toHaveBeenCalledWith('candidate')
  expect(shared.status).toHaveBeenCalledWith('gid')
  expect(shared.refresh).toHaveBeenCalledOnce()
  for (const effect of effects) await (await effect)()
  expect(flush).toHaveBeenCalledOnce()
})

it('hands the service a keyword-scoped source factory', async () => {
  vi.mocked(createPersistentSubmitStore).mockResolvedValue({ has: () => false, list: () => [], record: () => {}, flush: async () => {} })
  vi.mocked(createDownloadService).mockReturnValue({
    search: async () => [], listCandidates: async () => [], add: async () => ({ gid: 'g' }),
    status: async () => ({ state: 'active' }), refresh: async () => ({ discovered: 0, added: 0, skipped: 0, unsubmittable: 0 }),
  })
  const effects: Promise<unknown>[] = []
  const ctx = {
    reflect: { provide: vi.fn() }, credentials: { resolve: vi.fn(async () => undefined) },
    effect(callback: () => unknown) { effects.push(Promise.resolve(callback())) },
  } as unknown as Context
  new DownloadRemote(ctx, { endpoint: 'http://127.0.0.1:1/jsonrpc', tokenRef: 'T', timeoutMs: 1000, storePath: '/tmp/remote-spec.json', feedUrl: 'https://feeds.example.test/?page=rss' })
  await Promise.all(effects)
  const deps = vi.mocked(createDownloadService).mock.calls.at(-1)?.[0]
  expect(deps?.makeSource).toBeTypeOf('function')
  expect(deps?.makeSource?.('term')).toMatchObject({ listCandidates: expect.any(Function) })
})
