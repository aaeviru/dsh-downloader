import { describe, expect, it, vi } from 'vitest'
import type { Candidate } from '../src/candidate.ts'
import type { Downloader, Source, SubmitStore } from '../src/coordinator.ts'
import { createDownloadService, UnknownCandidateError } from '../src/service.ts'

function candidate(id: string, submittable = true): Candidate {
  return {
    id, title: id, sourceId: 'source', publishedAt: null, infoHash: null,
    magnetUri: null, torrentUrl: null, sizeBytes: null, sourceUrl: 'https://example.test',
    submittable, dedupeKey: id,
  }
}

function setup(entries: readonly Candidate[] = []) {
  const records = new Map<string, string>()
  const store: SubmitStore = {
    has: key => records.has(key),
    record: (key, gid) => { records.set(key, gid) },
    list: () => [...records].map(([key, gid]) => ({ key, gid })),
  }
  const list = vi.fn<Source['listCandidates']>().mockResolvedValue(entries)
  const add = vi.fn<Downloader['add']>().mockResolvedValue({ gid: 'download' })
  const status = vi.fn<Downloader['status']>().mockResolvedValue({ state: 'active' })
  const deps = { source: { listCandidates: list }, downloader: { add, status }, store } as Parameters<typeof createDownloadService>[0] & { makeSource?: (keyword: string) => Source }
  const service = createDownloadService(deps)
  return { list, add, status, store, service, deps }
}

describe('DownloadService', () => {
  it('B1/B2 searches through a keyword-scoped source for the requested page', async () => {
    const second = candidate('Beta')
    const { service, deps, add, list } = setup([candidate('Alpha')])
    const scoped = vi.fn(async () => [second])
    deps.makeSource = () => ({ listCandidates: scoped })
    expect(await service.search('beta', 3)).toEqual([second])
    expect(scoped).toHaveBeenCalledTimes(1)
    expect(await service.listCandidates(1)).toEqual([second])
    expect(list).not.toHaveBeenCalled()
    expect(add).not.toHaveBeenCalled()
  })

  it('B2 fetches every page request instead of caching', async () => {
    const { service, list } = setup([candidate('first')])
    expect(await service.listCandidates(1)).toHaveLength(1)
    expect(await service.listCandidates(1)).toHaveLength(1)
    expect(await service.listCandidates(2)).toHaveLength(1)
    expect(list).toHaveBeenCalledTimes(3)
  })

  it('B4 resolves ids from the last page and rejects unknown ones', async () => {
    const { service, list } = setup([candidate('known')])
    await service.listCandidates(1)
    await expect(service.add('missing')).rejects.toBeInstanceOf(UnknownCandidateError)
    await expect(service.add('missing')).rejects.toMatchObject({ candidateId: 'missing' })
    expect(list).toHaveBeenCalledTimes(3)
  })

  it('B5 adds a candidate from the last page and preserves coordinator outcomes', async () => {
    const { service, add, list } = setup([candidate('first')])
    await service.listCandidates(1)
    const gate = Promise.withResolvers<{ gid: string }>()
    add.mockReturnValueOnce(gate.promise)
    const pending = service.add('first')
    await vi.waitFor(() => { expect(add).toHaveBeenCalledTimes(1) })
    expect(await service.add('first')).toEqual({ alreadySubmitting: true })
    gate.resolve({ gid: 'download' })
    expect(await pending).toEqual({ gid: 'download' })
    expect(await service.add('first')).toEqual({ alreadySubmitted: 'download' })
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('B5 falls back to page one when the candidate is not on the last page', async () => {
    const { service, add, list } = setup([candidate('later')])
    await expect(service.add('later')).resolves.toEqual({ gid: 'download' })
    expect(list).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('B3 refresh delegates to the coordinator', async () => {
    const { service, list, add } = setup([candidate('first')])
    list.mockResolvedValueOnce([candidate('first'), candidate('new'), candidate('blocked', false)])
    expect(await service.refresh()).toEqual({ discovered: 3, added: 2, skipped: 0, unsubmittable: 1 })
    expect(add).toHaveBeenCalledTimes(2)
  })

  it('B6 passes status through unchanged', async () => {
    const { service, status } = setup()
    const result = { state: 'paused' }
    status.mockResolvedValue(result)
    expect(await service.status('gid')).toBe(result)
    expect(status).toHaveBeenCalledWith('gid')
  })
})
