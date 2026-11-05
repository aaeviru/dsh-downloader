import type { SubmitRecord, SubmitStore } from './coordinator.ts';
/** Persistence port; one implementation per backend. */
export interface SubmitStoreBackend {
    load(): Promise<readonly SubmitRecord[]>;
    save(records: readonly SubmitRecord[]): Promise<void>;
}
export interface PersistentSubmitStore extends SubmitStore {
    /** Resolve once every queued save has settled. */
    flush(): Promise<void>;
}
/** Hydrate from the backend, then persist after each accepted record. */
export declare function createPersistentSubmitStore(backend: SubmitStoreBackend): Promise<PersistentSubmitStore>;
//# sourceMappingURL=store.d.ts.map