import { describe, expect, it, vi } from 'vitest'
import { createDownloadCoordinator } from '../src/coordinator.ts'
import type { Candidate } from '../src/candidate.ts'
import type { Downloader, SubmitStore } from '../src/coordinator.ts'

function candidate(key: string, submittable = true): Candidate {
  return {
    id: `source:${key}`, sourceId: 'source', title: key, publishedAt: null,
    infoHash: null, magnetUri: null, torrentUrl: `https://example.test/${key}.torrent`,
    sizeBytes: null, sourceUrl: `https://example.test/${key}`, submittable, dedupeKey: key,
  }
}

function setup() {
  const records = new Map<string, string>()
  const store: SubmitStore = {
    has: key => records.has(key),
    record: (key, gid) => { records.set(key, gid) },
    list: () => [...records].map(([key, gid]) => ({ key, gid })),
  }
  const add = vi.fn<Downloader['add']>(async entry => ({ gid: `gid:${entry.dedupeKey}` }))
  const downloader: Downloader = { add, status: async () => ({ state: 'active' }) }
  return { coordinator: createDownloadCoordinator({ downloader, store }), downloader, store, add }
}

describe('createDownloadCoordinator', () => {
  it('returns the recorded gid on repeated submission of the same key', async () => {
    const entry = candidate('same')
    const { coordinator, add } = setup()
    expect(await coordinator.submit(entry)).toEqual({ gid: 'gid:same' })
    expect(await coordinator.submit({ ...entry, id: 'another-source' })).toEqual({ alreadySubmitted: 'gid:same' })
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('rejects with the key when the store claims a missing record exists', async () => {
    const { downloader, store } = setup()
    const inconsistentStore: SubmitStore = { ...store, has: () => true, list: () => [] }
    const coordinator = createDownloadCoordinator({ downloader, store: inconsistentStore })
    await expect(coordinator.submit(candidate('missing-key'))).rejects.toThrow('missing-key')
  })

  it('returns alreadySubmitting before the in-flight add completes', async () => {
    const { coordinator, add, store } = setup()
    const gate = Promise.withResolvers<{ gid: string }>()
    add.mockReturnValueOnce(gate.promise)
    const first = coordinator.submit(candidate('same'))
    expect(await coordinator.submit(candidate('same'))).toEqual({ alreadySubmitting: true })
    expect(store.list()).toEqual([])
    expect(add).toHaveBeenCalledTimes(1)
    gate.resolve({ gid: 'gated' })
    expect(await first).toEqual({ gid: 'gated' })
  })

  it('propagates add failure without recording and permits a later retry', async () => {
    const { coordinator, add, store } = setup()
    const error = new Error('add failed')
    add.mockRejectedValueOnce(error)
    await expect(coordinator.submit(candidate('retry'))).rejects.toBe(error)
    expect(store.list()).toEqual([])
    expect(add).toHaveBeenCalledTimes(1)
    expect(await coordinator.submit(candidate('retry'))).toEqual({ gid: 'gid:retry' })
    expect(add).toHaveBeenCalledTimes(2)
    expect(store.list()).toEqual([{ key: 'retry', gid: 'gid:retry' }])
  })

  it('returns unsubmittable candidates without adding them', async () => {
    const entry = candidate('blocked', false)
    const { coordinator, add } = setup()
    expect(await coordinator.submit(entry)).toEqual({ unsubmittable: true })
    expect(add).not.toHaveBeenCalled()
  })

  it('records exactly the candidate dedupeKey', async () => {
    const entry = candidate('ih:0123456789abcdef0123456789abcdef01234567')
    const { coordinator, store } = setup()
    await coordinator.submit(entry)
    expect(store.list()).toEqual([{ key: entry.dedupeKey, gid: `gid:${entry.dedupeKey}` }])
  })

  it('checks submittable before records and records before in-flight submissions', async () => {
    const { coordinator, add, store } = setup()
    store.record('recorded', 'existing')
    expect(await coordinator.submit(candidate('recorded', false))).toEqual({ unsubmittable: true })
    expect(await coordinator.submit(candidate('recorded'))).toEqual({ alreadySubmitted: 'existing' })
    const gate = Promise.withResolvers<{ gid: string }>()
    add.mockReturnValueOnce(gate.promise)
    const pending = coordinator.submit(candidate('pending'))
    expect(await coordinator.submit(candidate('pending', false))).toEqual({ unsubmittable: true })
    store.record('pending', 'external')
    expect(await coordinator.submit(candidate('pending'))).toEqual({ alreadySubmitted: 'external' })
    expect(add).toHaveBeenCalledTimes(1)
    gate.resolve({ gid: 'finished' })
    await pending
  })

  it('keeps in-flight protection local to each coordinator instance', async () => {
    const first = setup()
    const second = createDownloadCoordinator({ downloader: first.downloader, store: first.store })
    const gate = Promise.withResolvers<{ gid: string }>()
    first.add.mockReturnValueOnce(gate.promise)
    const pending = first.coordinator.submit(candidate('same'))
    expect(await second.submit(candidate('same'))).toEqual({ gid: 'gid:same' })
    expect(first.add).toHaveBeenCalledTimes(2)
    gate.resolve({ gid: 'first' })
    await pending
  })
})

it('resubmits recorded keys once, preserves records on failure, and shares the in-flight guard', async () => {
  const { coordinator, store, add } = setup()
  const entry = candidate('recorded')
  store.record(entry.dedupeKey, 'old')
  const gate = Promise.withResolvers<{ gid: string }>()
  add.mockReturnValueOnce(gate.promise)
  const pending = coordinator.resubmit(entry)
  expect(await coordinator.resubmit(entry)).toEqual({ alreadySubmitting: true })
  expect(await coordinator.submit(entry)).toEqual({ alreadySubmitted: 'old' })
  expect(store.list()).toEqual([{ key: entry.dedupeKey, gid: 'old' }])
  expect(add).toHaveBeenCalledExactlyOnceWith(entry)
  gate.resolve({ gid: 'new' })
  expect(await pending).toEqual({ gid: 'new' })
  expect(store.list()).toEqual([{ key: entry.dedupeKey, gid: 'new' }])
  add.mockRejectedValueOnce(new Error('offline'))
  await expect(coordinator.resubmit(entry)).rejects.toThrow('offline')
  expect(store.list()).toEqual([{ key: entry.dedupeKey, gid: 'new' }])
  expect(await coordinator.resubmit({ ...entry, submittable: false })).toEqual({ unsubmittable: true })
  expect(add).toHaveBeenCalledTimes(2)
  expect(await coordinator.resubmit(entry)).toEqual({ gid: 'gid:recorded' })
})

it('blocks resubmit while an ordinary submission is pending', async () => {
  const { coordinator, add } = setup()
  const gate = Promise.withResolvers<{ gid: string }>()
  add.mockReturnValueOnce(gate.promise)
  const pending = coordinator.submit(candidate('pending'))
  expect(await coordinator.resubmit(candidate('pending'))).toEqual({ alreadySubmitting: true })
  expect(add).toHaveBeenCalledOnce()
  gate.resolve({ gid: 'first' })
  await pending
})
