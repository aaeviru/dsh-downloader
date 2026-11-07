import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { Candidate, RefreshResult, SubmitRecord, SubmitResult } from '../types.ts';
export type { SubmitResult } from '../types.ts';
/** Browser operations consumed by the downloader panel. */
export interface DownloadNamespace {
    list: () => Promise<RemoteResult<readonly Candidate[]>>;
    search: (keyword: string) => Promise<RemoteResult<readonly Candidate[]>>;
    refresh: () => Promise<RemoteResult<RefreshResult>>;
    submissions: () => Promise<RemoteResult<readonly SubmitRecord[]>>;
    resubmit: (candidateId: string) => Promise<RemoteResult<SubmitResult>>;
    add: (candidateId: string) => Promise<RemoteResult<SubmitResult>>;
}
//# sourceMappingURL=namespace.d.ts.map