import { dedupeCandidates } from './candidate.ts'
import type { Candidate } from './candidate.ts'
import { createDownloadCoordinator } from './coordinator.ts'
import type { Downloader, RefreshResult, Source, SubmitResult, SubmitStore } from './coordinator.ts'

export class UnknownCandidateError extends Error {
  readonly candidateId: string

  constructor(candidateId: string) {
    super(`Unknown candidate: ${candidateId}`)
    this.name = 'UnknownCandidateError'
    this.candidateId = candidateId
  }
}

export interface DownloadService {
  search(keyword: string, page: number): Promise<readonly Candidate[]>
  listCandidates(page: number): Promise<readonly Candidate[]>
  add(candidateId: string): Promise<SubmitResult>
  status(gid: string): Promise<{ state: string }>
  refresh(): Promise<RefreshResult>
}

/** Create the service over the three injected seams. */
export function createDownloadService(deps: {
  readonly source: Source
  /** Build a source for one keyword and page; defaults to the configured source. */
  readonly makeSource?: (keyword: string, page: number) => Source
  readonly downloader: Downloader
  readonly store: SubmitStore
}): DownloadService {
  const coordinator = createDownloadCoordinator(deps)
  // Only `add` reads this: pages are always fetched fresh.
  let lastPage: readonly Candidate[] = []

  async function fetchPage(keyword: string, page: number): Promise<readonly Candidate[]> {
    const source = (deps.makeSource ?? (() => deps.source))(keyword, page)
    lastPage = dedupeCandidates(await source.listCandidates())
    return lastPage
  }

  return {
    search: (keyword, page) => fetchPage(keyword, page),
    listCandidates: page => fetchPage('', page),
    async add(candidateId) {
      let candidate = lastPage.find(entry => entry.id === candidateId)
      if (candidate === undefined) {
        await fetchPage('', 1)
        candidate = lastPage.find(entry => entry.id === candidateId)
      }
      if (candidate === undefined) throw new UnknownCandidateError(candidateId)
      return coordinator.submit(candidate)
    },
    status(gid) {
      return deps.downloader.status(gid)
    },
    refresh() {
      return coordinator.refresh()
    },
  }
}
