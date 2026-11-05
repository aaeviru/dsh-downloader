import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { Candidate, RefreshResult, SubmitResult } from '../types.ts';
export type { SubmitResult } from '../types.ts';
/** Browser operations consumed by the downloader panel. */
export interface DownloadNamespace {
    list: (page: number) => Promise<RemoteResult<readonly Candidate[]>>;
    search: (keyword: string, page: number) => Promise<RemoteResult<readonly Candidate[]>>;
    refresh: () => Promise<RemoteResult<RefreshResult>>;
    add: (candidateId: string) => Promise<RemoteResult<SubmitResult>>;
}
//# sourceMappingURL=namespace.d.ts.map