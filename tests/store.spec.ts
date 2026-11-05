import { describe, expect, it, vi } from 'vitest'
import { createPersistentSubmitStore } from '../src/store.ts'
import type { SubmitRecord } from '../src/coordinator.ts'

function backend() {
  let saved: readonly SubmitRecord[] = []
  const log: (readonly SubmitRecord[])[] = []
  const save = vi.fn(async (records: readonly SubmitRecord[]) => {
    log.push(records)
    saved = records
  })
  return { load: vi.fn(async () => saved), save, log }
}

describe('createPersistentSubmitStore', () => {
  it('hydrates before synchronous reads and survives a restart', async () => {
    const storage = backend()
    const store = await createPersistentSubmitStore(storage)
    await store.flush()
    expect(store.has('missing')).toBe(false)
    store.record('first', '1')
    await store.flush()
    const restarted = await createPersistentSubmitStore(storage)
    expect(restarted.has('first')).toBe(true)
    expect(restarted.list()).toEqual([{ key: 'first', gid: '1' }])
    expect(storage.load).toHaveBeenCalledTimes(2)
    expect(storage.log).toEqual([[{ key: 'first', gid: '1' }]])
  })

  it('replaces duplicate keys in first insertion order with independent snapshots', async () => {
    const storage = backend()
    const store = await createPersistentSubmitStore(storage)
    store.record('a', '1')
    const previous = store.list()
    store.record('b', '2')
    store.record('a', '3')
    expect(store.list()).toEqual([{ key: 'a', gid: '3' }, { key: 'b', gid: '2' }])
    expect(previous).toEqual([{ key: 'a', gid: '1' }])
    await store.flush()
    expect(storage.log).toEqual([
      [{ key: 'a', gid: '1' }],
      [{ key: 'a', gid: '1' }, { key: 'b', gid: '2' }],
      [{ key: 'a', gid: '3' }, { key: 'b', gid: '2' }],
    ])
  })

  it('serializes saves and flush waits for records appended while waiting', async () => {
    const storage = backend()
    const first = Promise.withResolvers<undefined>()
    const second = Promise.withResolvers<undefined>()
    storage.save.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const store = await createPersistentSubmitStore(storage)
    store.record('a', '1')
    const settled = vi.fn()
    const flushing = store.flush().then(settled)
    store.record('b', '2')
    await Promise.resolve(undefined)
    expect(storage.save).toHaveBeenCalledTimes(1)
    expect(settled).not.toHaveBeenCalled()
    first.resolve(undefined)
    await vi.waitFor(() => { expect(storage.save).toHaveBeenCalledTimes(2) })
    expect(settled).not.toHaveBeenCalled()
    second.resolve(undefined)
    await flushing
    expect(settled).toHaveBeenCalledOnce()
  })

  it('reports the first queued failure and accepts later records', async () => {
    const storage = backend()
    const error = new Error('save failed')
    storage.save.mockRejectedValueOnce(error).mockRejectedValueOnce(new Error('later failure'))
    const store = await createPersistentSubmitStore(storage)
    store.record('a', '1')
    store.record('b', '2')
    await expect(store.flush()).rejects.toBe(error)
    store.record('c', '3')
    await expect(store.flush()).resolves.toBeUndefined()
    expect((await createPersistentSubmitStore(storage)).list()).toEqual(store.list())
  })

  it('propagates hydration failure', async () => {
    const storage = backend()
    const error = new Error('load failed')
    storage.load.mockRejectedValueOnce(error)
    await expect(createPersistentSubmitStore(storage)).rejects.toBe(error)
  })
})
