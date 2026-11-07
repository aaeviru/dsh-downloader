import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { Preferences, Candidate, RefreshResult, SubmitRecord, SubmitResult } from '../types.ts'

export type { SubmitResult } from '../types.ts'

/** Browser operations consumed by the downloader panel. */
export interface DownloadNamespace {
  preferences: () => Promise<RemoteResult<Preferences>>
  recordSearch: (keyword: string) => Promise<RemoteResult<Preferences>>
  toggleFavorite: (keyword: string) => Promise<RemoteResult<Preferences>>
  deleteSearch: (keyword: string) => Promise<RemoteResult<Preferences>>
  clearHistory: () => Promise<RemoteResult<Preferences>>
  list: () => Promise<RemoteResult<readonly Candidate[]>>
  search: (keyword: string) => Promise<RemoteResult<readonly Candidate[]>>
  refresh: () => Promise<RemoteResult<RefreshResult>>
  submissions: () => Promise<RemoteResult<readonly SubmitRecord[]>>
  resubmit: (candidateId: string) => Promise<RemoteResult<SubmitResult>>
  add: (candidateId: string) => Promise<RemoteResult<SubmitResult>>
}
