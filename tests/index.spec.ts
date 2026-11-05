import { mkdtemp, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { afterEach, expect, it, vi } from 'vitest'
import { apply, Config, inject, name, resolveStorePath } from '../src/index.ts'
import { createDownloadService } from '../src/service.ts'
import { createDownloadTools } from '../src/tools.ts'
import type { Candidate } from '../src/candidate.ts'

vi.mock('../src/service.ts', { spy: true })
vi.mock('../src/tools.ts', { spy: true })
afterEach(() => { vi.restoreAllMocks() })

it('supplies mount defaults and validates timeout', () => {
  expect(name).toBe('dsh-downloader')
  expect(inject).toEqual(['tools', 'credentials', 'typert'])
  expect(Config({})).toEqual({ endpoint: 'http://10.0.0.7:8082/jsonrpc', tokenRef: 'ARIA2_TOKEN', timeoutMs: 15000, storePath: 'downloader/submissions.json', feedUrl: 'https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2' })
  expect(() => Config({ timeoutMs: 0 })).toThrow()
})

it('resolves the store path against DSH_HOME and falls back to ~/.dsh', () => {
  expect(resolveStorePath('a/b.json', { DSH_HOME: '/tmp/home' })).toBe('/tmp/home/a/b.json')
  expect(resolveStorePath('/abs/b.json', {})).toBe('/abs/b.json')
  expect(resolveStorePath('b.json', {})).toBe(join(homedir(), '.dsh', 'b.json'))
})

it.each([false, true])('wires persistent store, credentials, tools and disposal (absolute=%s)', async (absolute) => {
  const directory = await mkdtemp(join(tmpdir(), 'downloader-plugin-'))
  const previousHome = process.env.DSH_HOME
  try {
    const effects: Promise<() => void | Promise<void>>[] = []
    const disposers = [vi.fn(), vi.fn(), vi.fn()]
    let registration = 0
    const register = vi.fn(() => disposers[registration++]!)
    const resolve = vi.fn()
      .mockResolvedValueOnce({ value: 'first', source: 'test' }).mockResolvedValueOnce(undefined).mockResolvedValue({ value: 'rotated', source: 'test' })
    process.env.DSH_HOME = directory
    const ctx = {
      reflect: { provide: vi.fn() },
      tools: { register }, credentials: { resolve },
      effect: (callback: () => (() => void | Promise<void>) | Promise<() => void | Promise<void>>) => {
        effects.push(Promise.resolve(callback()))
      },
    }
    const config = Config({ storePath: absolute ? join(directory, 'records.json') : 'records.json' })
    apply(ctx as Context, config)
    await Promise.all(effects)
    const deps = vi.mocked(createDownloadService).mock.calls.at(-1)![0]
    const [service, options] = vi.mocked(createDownloadTools).mock.calls.at(-1)!
    expect(options.clock()).toBeInstanceOf(Date)
    expect(deps.source).toBeDefined()
    expect(register.mock.calls).toHaveLength(3)
    const requests: { method: string; params: unknown[] }[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(init.body as string) as { id: number; method: string; params: unknown[] }
      requests.push(request)
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: request.method === 'aria2.addUri' ? 'gid' : { gid: 'gid', status: 'active' } }))
    }))
    const candidate: Candidate = {
      id: 'c', title: 'title', sourceId: 'source', sourceUrl: 'https://example.test/c', publishedAt: null,
      infoHash: null, sizeBytes: null, submittable: true, dedupeKey: 'key',
      torrentUrl: 'https://example.test/a.torrent', magnetUri: 'magnet:?xt=test',
    }
    expect(await deps.downloader.add(candidate)).toEqual({ gid: 'gid' })
    await deps.downloader.add({ ...candidate, torrentUrl: null })
    expect(await service.status('gid')).toEqual({ state: 'active' })
    await expect(deps.downloader.add({ ...candidate, torrentUrl: null, magnetUri: null })).rejects.toThrow('neither a torrent URL nor a magnet URI')
    expect(requests.map(request => request.params)).toEqual([
      ['token:first', [candidate.torrentUrl]], [[candidate.magnetUri]], ['token:rotated', 'gid'],
    ])
    expect(resolve.mock.calls).toEqual([['ARIA2_TOKEN'], ['ARIA2_TOKEN'], ['ARIA2_TOKEN']])
    deps.store.record('key', 'gid')
    for (const effect of effects) await (await effect)()
    expect(disposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
    const { createJsonFileSubmitStoreBackend } = await import('../src/store-json.ts')
    expect(await createJsonFileSubmitStoreBackend(join(directory, 'records.json')).load()).toEqual([{ key: 'key', gid: 'gid' }])
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    vi.unstubAllGlobals()
    await rm(directory, { recursive: true, force: true })
  }
})
