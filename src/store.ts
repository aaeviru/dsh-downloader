import type { SubmitRecord, SubmitStore } from './coordinator.ts'

/** Persistence port; one implementation per backend. */
export interface SubmitStoreBackend {
  load(): Promise<readonly SubmitRecord[]>
  save(records: readonly SubmitRecord[]): Promise<void>
}

/** Records are visible immediately; saves are serialized and failures are reported by flush after the queue drains. */
export interface PersistentSubmitStore extends SubmitStore {
  /** Resolve once every queued save has settled. */
  flush(): Promise<void>
}

/**
 * Hydrate from the backend, then persist after each accepted record.
 * @param backend - Loads initial records and saves complete snapshots; load failures reject creation.
 * @returns A hydrated store whose flush rejects with the first save failure in each drained batch.
 */
export async function createPersistentSubmitStore(backend: SubmitStoreBackend): Promise<PersistentSubmitStore> {
  const records = new Map((await backend.load()).map(record => [record.key, { ...record }]))
  let queue = Promise.resolve()
  const failures: unknown[] = []
  const list = () => [...records.values()].map(record => ({ ...record }))

  return {
    has: key => records.has(key),
    list,
    record(key, gid) {
      records.set(key, { key, gid })
      const snapshot = list()
      queue = queue.then(() => backend.save(snapshot)).catch((error: unknown) => { failures.push(error) })
    },
    async flush() {
      // Include saves appended while a flush is waiting, until the queue drains.
      let pending: Promise<void>
      do {
        pending = queue
        await pending
      } while (pending !== queue)
      // Report the first failure once per drained batch, including undefined rejections.
      if (failures.length > 0) {
        const [first] = failures.splice(0)
        throw first
      }
    },
  }
}
