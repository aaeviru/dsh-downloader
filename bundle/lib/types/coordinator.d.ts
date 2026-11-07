/** Coordinate candidate submission with recorded keys and per-instance in-flight protection. */
import type { Candidate } from './candidate.ts';
/** Discovers candidates; retrieval failures reject the listing operation. */
export interface Source {
    listCandidates(): Promise<readonly Candidate[]>;
}
/** Submits candidates and queries remote state; successful submission returns the remote download identifier. */
export interface Downloader {
    add(candidate: Candidate): Promise<{
        gid: string;
    }>;
    status(gid: string): Promise<{
        state: string;
    }>;
}
/** Associates a deduplication key with the remote identifier of an accepted submission. */
export interface SubmitRecord {
    readonly key: string;
    readonly gid: string;
}
/** Tracks accepted submissions; every key reported by has must have a matching record in list. */
export interface SubmitStore {
    has(key: string): boolean;
    record(key: string, gid: string): void;
    list(): readonly SubmitRecord[];
}
/** Distinguishes a new acceptance from a recorded, pending, or unsupported submission without treating skips as failures. */
export type SubmitResult = {
    readonly gid: string;
} | {
    readonly alreadySubmitted: string;
} | {
    readonly alreadySubmitting: true;
} | {
    readonly unsubmittable: true;
};
/** Suppresses recorded and per-instance pending duplicates. */
export interface DownloadCoordinator {
    submit(candidate: Candidate): Promise<SubmitResult>;
    /**
     * Explicitly submit again; failed attempts preserve the previous record.
     * @param candidate - Candidate to send, even when its key is recorded.
     * @returns The new gid or an in-flight/unsupported outcome.
     */
    resubmit(candidate: Candidate): Promise<SubmitResult>;
}
/**
 * Create a coordinator over the downloader and submission store.
 * @param deps - Downloader and accepted-submission store; failures propagate to callers.
 * @returns A coordinator that records successful submissions and prevents duplicate in-flight work within this instance.
 */
export declare function createDownloadCoordinator(deps: {
    readonly downloader: Downloader;
    readonly store: SubmitStore;
}): DownloadCoordinator;
//# sourceMappingURL=coordinator.d.ts.map