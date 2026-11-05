import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { Candidate, RefreshResult, SubmitResult } from '../types.ts'

export type { SubmitResult } from '../types.ts'

/** Browser operations consumed by the downloader panel. */
export interface DownloadNamespace {
  list: () => Promise<RemoteResult<readonly Candidate[]>>
  refresh: () => Promise<RemoteResult<RefreshResult>>
  add: (candidateId: string) => Promise<RemoteResult<SubmitResult>>
}
