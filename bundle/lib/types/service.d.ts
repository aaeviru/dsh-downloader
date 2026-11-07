import type { Candidate } from './candidate.ts';
import type { Downloader, Source, SubmitRecord, SubmitResult, SubmitStore } from './coordinator.ts';
/** Read-only discovery results; known counts keys already recorded in the submission store. */
export interface RefreshResult {
    readonly candidates: readonly Candidate[];
    readonly discovered: number;
    readonly known: number;
    readonly unsubmittable: number;
}
/** The requested identifier is absent from the candidate set available to the service. */
export declare class UnknownCandidateError extends Error {
    /** Requested identifier that could not be resolved for submission. */
    readonly candidateId: string;
    constructor(candidateId: string);
}
/** Caches discovered candidates for identifier-based submission; search replaces the cache and refresh reloads it. */
export interface DownloadService {
    search(keyword: string): Promise<readonly Candidate[]>;
    listCandidates(): Promise<readonly Candidate[]>;
    add(candidateId: string): Promise<SubmitResult>;
    /**
     * Read accepted submissions.
     * @returns Store records keyed by candidate dedupe key.
     */
    submissions(): readonly SubmitRecord[];
    /**
     * Submit again, replacing the record only on success.
     * @param candidateId - Identifier from the last discovery; a miss triggers one fresh discovery.
     * @returns The submission outcome; unknown identifiers reject with UnknownCandidateError.
     */
    resubmit(candidateId: string): Promise<SubmitResult>;
    status(gid: string): Promise<{
        state: string;
    }>;
    /** Reload the last executed query once; failure preserves the cache and submission records. */
    refresh(): Promise<RefreshResult>;
}
/**
 * Create the service over the three injected seams.
 * @param deps - Discovery, optional keyword-scoped discovery, downloader, and submission storage providers.
 * @returns A service with a private candidate cache; unknown submission identifiers reject with UnknownCandidateError.
 */
export declare function createDownloadService(deps: {
    readonly source: Source;
    /** Build a source scoped to one search keyword; defaults to the configured source. */
    readonly makeSource?: (keyword: string) => Source;
    readonly downloader: Downloader;
    readonly store: SubmitStore;
}): DownloadService;
//# sourceMappingURL=service.d.ts.map