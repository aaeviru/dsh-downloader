import type { Candidate } from './candidate.ts';
export interface Source {
    listCandidates(): Promise<readonly Candidate[]>;
}
export interface Downloader {
    add(candidate: Candidate): Promise<{
        gid: string;
    }>;
    status(gid: string): Promise<{
        state: string;
    }>;
}
export interface SubmitRecord {
    readonly key: string;
    readonly gid: string;
}
export interface SubmitStore {
    has(key: string): boolean;
    record(key: string, gid: string): void;
    list(): readonly SubmitRecord[];
}
export interface RefreshResult {
    readonly discovered: number;
    readonly added: number;
    readonly skipped: number;
    readonly unsubmittable: number;
}
export type SubmitResult = {
    readonly gid: string;
} | {
    readonly alreadySubmitted: string;
} | {
    readonly alreadySubmitting: true;
} | {
    readonly unsubmittable: true;
};
export interface DownloadCoordinator {
    refresh(): Promise<RefreshResult>;
    submit(candidate: Candidate): Promise<SubmitResult>;
}
/** Create a coordinator over the three injected seams. */
export declare function createDownloadCoordinator(deps: {
    readonly source: Source;
    readonly downloader: Downloader;
    readonly store: SubmitStore;
}): DownloadCoordinator;
//# sourceMappingURL=coordinator.d.ts.map