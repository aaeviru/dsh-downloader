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
  const service = createDownloadService({ source: { listCandidates: list }, downloader: { add, status }, store })
  return { list, add, status, store, service }
}

describe('DownloadService', () => {
  it('B1/B2 searches case-insensitively, deduplicates and caches the unfiltered list without submitting', async () => {
    const first = candidate('Alpha')
    const second = candidate('Beta')
    const { service, list, add } = setup([first, { ...first, id: 'duplicate' }, second])
    expect(await service.search('ALP')).toEqual([first])
    expect(await service.listCandidates()).toEqual([first, second])
    expect(await service.listCandidates()).toEqual([first, second])
    expect(list).toHaveBeenCalledTimes(1)
    list.mockResolvedValue([second])
    expect(await service.search('alpha')).toEqual([])
    expect(await service.listCandidates()).toEqual([second])
    expect(list).toHaveBeenCalledTimes(2)
    expect(add).not.toHaveBeenCalled()
  })

  it('B2 discovers once on first listing, including an empty result', async () => {
    const { service, list, add } = setup()
    expect(await service.listCandidates()).toEqual([])
    expect(await service.listCandidates()).toEqual([])
    expect(list).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
    const entry = candidate('first')
    const populated = setup([entry, entry])
    expect(await populated.service.listCandidates()).toEqual([entry])
    expect(populated.add).not.toHaveBeenCalled()
  })

  it('B4 rejects unknown ids with their identity without rediscovering a populated cache', async () => {
    const { service, list, add } = setup([candidate('known')])
    await service.listCandidates()
    await expect(service.add('missing')).rejects.toBeInstanceOf(UnknownCandidateError)
    await expect(service.add('missing')).rejects.toMatchObject({ candidateId: 'missing', message: 'Unknown candidate: missing' })
    expect(list).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
  })

  it('B5 discovers before adding and preserves all coordinator outcomes', async () => {
    const { service, add, list } = setup([candidate('first'), candidate('blocked', false)])
    const gate = Promise.withResolvers<{ gid: string }>()
    add.mockReturnValueOnce(gate.promise)
    const pending = service.add('first')
    await vi.waitFor(() => { expect(add).toHaveBeenCalledTimes(1) })
    expect(await service.add('first')).toEqual({ alreadySubmitting: true })
    gate.resolve({ gid: 'download' })
    expect(await pending).toEqual({ gid: 'download' })
    expect(await service.add('first')).toEqual({ alreadySubmitted: 'download' })
    expect(await service.add('blocked')).toEqual({ unsubmittable: true })
    expect(list).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('B4/B5 rediscovers an empty cache before adding', async () => {
    const { service, list } = setup()
    await expect(service.add('later')).rejects.toMatchObject({ candidateId: 'later' })
    list.mockResolvedValue([candidate('later')])
    expect(await service.add('later')).toEqual({ gid: 'download' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('B3 refresh shares submission records and replaces the cache with a second discovery', async () => {
    const first = candidate('first')
    const next = candidate('next')
    const { service, list, add } = setup([first])
    await service.add('first')
    list.mockResolvedValueOnce([first, candidate('new'), candidate('blocked', false)])
      .mockResolvedValueOnce([next, next])
    expect(await service.refresh()).toEqual({ discovered: 3, added: 1, skipped: 1, unsubmittable: 1 })
    expect(await service.listCandidates()).toEqual([next])
    expect(list).toHaveBeenCalledTimes(3)
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
