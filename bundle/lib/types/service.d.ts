import type { Candidate } from './candidate.ts';
import type { Downloader, RefreshResult, Source, SubmitResult, SubmitStore } from './coordinator.ts';
export declare class UnknownCandidateError extends Error {
    readonly candidateId: string;
    constructor(candidateId: string);
}
export interface DownloadService {
    search(keyword: string): Promise<readonly Candidate[]>;
    listCandidates(): Promise<readonly Candidate[]>;
    add(candidateId: string): Promise<SubmitResult>;
    status(gid: string): Promise<{
        state: string;
    }>;
    refresh(): Promise<RefreshResult>;
}
/** Create the service over the three injected seams. */
export declare function createDownloadService(deps: {
    readonly source: Source;
    readonly downloader: Downloader;
    readonly store: SubmitStore;
}): DownloadService;
//# sourceMappingURL=service.d.ts.map