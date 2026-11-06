import type { SubmitRecord, SubmitStore } from './coordinator.ts';
/** Persistence port; one implementation per backend. */
export interface SubmitStoreBackend {
    load(): Promise<readonly SubmitRecord[]>;
    save(records: readonly SubmitRecord[]): Promise<void>;
}
/** Records are visible immediately; saves are serialized and failures are reported by flush after the queue drains. */
export interface PersistentSubmitStore extends SubmitStore {
    /** Resolve once every queued save has settled. */
    flush(): Promise<void>;
}
/**
 * Hydrate from the backend, then persist after each accepted record.
 * @param backend - Loads initial records and saves complete snapshots; load failures reject creation.
 * @returns A hydrated store whose flush rejects with the first save failure in each drained batch.
 */
export declare function createPersistentSubmitStore(backend: SubmitStoreBackend): Promise<PersistentSubmitStore>;
//# sourceMappingURL=store.d.ts.map