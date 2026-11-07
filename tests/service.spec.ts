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
  it('B1/B2 searches through a keyword-scoped source and caches its result', async () => {
    const first = candidate('Alpha')
    const second = candidate('Beta')
    const { service, deps, add } = setup([first])
    const scoped = vi.fn(async () => [second])
    deps.makeSource = () => ({ listCandidates: scoped })
    expect(await service.search('beta')).toEqual([second])
    expect(scoped).toHaveBeenCalledTimes(1)
    expect(await service.listCandidates()).toEqual([second])
    expect(scoped).toHaveBeenCalledTimes(1)
    expect(add).not.toHaveBeenCalled()
  })

  it('B1 falls back to the configured source when no keyword source is supplied', async () => {
    const entry = candidate('Plain')
    const { service, list } = setup([entry])
    expect(await service.search('anything')).toEqual([entry])
    expect(list).toHaveBeenCalledTimes(1)
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

  it('B1/B2 refresh deduplicates discoveries without submissions and requests the source once each time', async () => {
    const first = candidate('first')
    const second = candidate('second')
    const { service, list, add, store } = setup([first, second, { ...first, id: 'duplicate' }])
    for (let count = 1; count <= 2; count++) {
      expect(await service.refresh()).toEqual({ candidates: [first, second], discovered: 2, known: 0, unsubmittable: 0 })
      expect(await service.listCandidates()).toEqual([first, second])
      expect(list).toHaveBeenCalledTimes(count)
      expect(add).not.toHaveBeenCalled()
      expect(store.list()).toEqual([])
    }
  })

  it('B1 refresh returns zero counts for an empty source', async () => {
    const { service, add } = setup()
    expect(await service.refresh()).toEqual({ candidates: [], discovered: 0, known: 0, unsubmittable: 0 })
    expect(add).not.toHaveBeenCalled()
  })

  it('B3 refresh preserves recorded gids and counts mixed candidates without submitting', async () => {
    const entries = [candidate('new'), candidate('recorded'), candidate('blocked', false)]
    const { service, list, add, store } = setup([...entries, entries[0]!])
    store.record('recorded', 'existing-gid')
    store.record('unrelated', 'other-gid')
    const records = store.list()
    expect(await service.refresh()).toEqual({ candidates: entries, discovered: 3, known: 1, unsubmittable: 1 })
    expect(await service.listCandidates()).toEqual(entries)
    expect(await service.add('recorded')).toEqual({ alreadySubmitted: 'existing-gid' })
    expect(list).toHaveBeenCalledOnce()
    expect(add).not.toHaveBeenCalled()
    expect(store.list()).toEqual(records)
  })

  it('B4 direct refresh reuses the last executed search source', async () => {
    const { service, deps, list, add } = setup()
    const entry = candidate('alpha')
    const scoped = vi.fn(async () => [entry])
    deps.makeSource = vi.fn(() => ({ listCandidates: scoped }))
    await service.search('alpha')
    expect(await service.refresh()).toEqual({ candidates: [entry], discovered: 1, known: 0, unsubmittable: 0 })
    expect(deps.makeSource).toHaveBeenCalledWith('alpha')
    expect(scoped).toHaveBeenCalledTimes(2)
    expect(list).not.toHaveBeenCalled()
    expect(add).not.toHaveBeenCalled()
  })

  it.each(['timeout', 'HTTP error', 'parse failure'])('B5 preserves cache and records on %s and permits retry', async message => {
    const previous = candidate('previous')
    const next = candidate('next')
    const { service, list, add, store } = setup([previous])
    await service.listCandidates()
    store.record('previous', 'existing')
    const records = store.list()
    const error = new Error(message)
    list.mockRejectedValueOnce(error).mockResolvedValueOnce([next])
    await expect(service.refresh()).rejects.toBe(error)
    expect(await service.listCandidates()).toEqual([previous])
    expect(store.list()).toEqual(records)
    expect(await service.refresh()).toEqual({ candidates: [next], discovered: 1, known: 0, unsubmittable: 0 })
    expect(list).toHaveBeenCalledTimes(3)
    expect(store.list()).toEqual(records)
    expect(add).not.toHaveBeenCalled()
  })

  it('B6 refresh then manual submission adds only the selected row once', async () => {
    const selected = candidate('selected')
    const { service, add, store } = setup([selected, candidate('other')])
    await service.refresh()
    expect(add).not.toHaveBeenCalled()
    expect(await service.add('selected')).toEqual({ gid: 'download' })
    expect(await service.add('selected')).toEqual({ alreadySubmitted: 'download' })
    expect(add.mock.calls).toEqual([[selected]])
    expect(store.list()).toEqual([{ key: 'selected', gid: 'download' }])
  })

  it('refresh during a manual submission neither submits nor records pending work', async () => {
    const entry = candidate('pending')
    const { service, add, store } = setup([entry])
    await service.listCandidates()
    const gate = Promise.withResolvers<{ gid: string }>()
    add.mockReturnValueOnce(gate.promise)
    const pending = service.add(entry.id)
    expect(await service.refresh()).toEqual({ candidates: [entry], discovered: 1, known: 0, unsubmittable: 0 })
    expect(add).toHaveBeenCalledOnce()
    expect(store.list()).toEqual([])
    gate.resolve({ gid: 'manual' })
    await pending
  })

  it('B6 passes status through unchanged', async () => {
    const { service, status } = setup()
    const result = { state: 'paused' }
    status.mockResolvedValue(result)
    expect(await service.status('gid')).toBe(result)
    expect(status).toHaveBeenCalledWith('gid')
  })
})

it('lists Host records and resubmits from the last discovery without fetching again', async () => {
  const entry = candidate('known')
  const { service, store, add, list } = setup([entry])
  store.record(entry.dedupeKey, 'old')
  expect(service.submissions()).toEqual([{ key: entry.dedupeKey, gid: 'old' }])
  await service.search('known')
  expect(await service.resubmit(entry.id)).toEqual({ gid: 'download' })
  expect(list).toHaveBeenCalledOnce()
  expect(add).toHaveBeenCalledExactlyOnceWith(entry)
  expect(service.submissions()).toEqual([{ key: entry.dedupeKey, gid: 'download' }])
})

it('resubmit discovers once without a cache and retries discovery once on a cache miss', async () => {
  const { service, list } = setup([candidate('first')])
  expect(await service.resubmit('first')).toEqual({ gid: 'download' })
  list.mockResolvedValueOnce([candidate('next')])
  expect(await service.resubmit('next')).toEqual({ gid: 'download' })
  expect(list).toHaveBeenCalledTimes(2)
  await expect(service.resubmit('missing')).rejects.toBeInstanceOf(UnknownCandidateError)
  expect(list).toHaveBeenCalledTimes(3)
})
