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
  search(keyword: string): Promise<readonly Candidate[]>
  listCandidates(): Promise<readonly Candidate[]>
  add(candidateId: string): Promise<SubmitResult>
  status(gid: string): Promise<{ state: string }>
  refresh(): Promise<RefreshResult>
}

/** Create the service over the three injected seams. */
export function createDownloadService(deps: {
  readonly source: Source
  readonly downloader: Downloader
  readonly store: SubmitStore
}): DownloadService {
  const coordinator = createDownloadCoordinator(deps)
  let cache: readonly Candidate[] | undefined

  async function discover(): Promise<readonly Candidate[]> {
    cache = dedupeCandidates(await deps.source.listCandidates())
    return cache
  }

  return {
    async search(keyword) {
      const candidates = await discover()
      return candidates.filter(candidate => candidate.title.toLowerCase().includes(keyword.toLowerCase()))
    },
    async listCandidates() {
      return cache ?? discover()
    },
    async add(candidateId) {
      const candidates = !cache || cache.length === 0 ? await discover() : cache
      const candidate = candidates.find(candidate => candidate.id === candidateId)
      if (!candidate) throw new UnknownCandidateError(candidateId)
      return coordinator.submit(candidate)
    },
    status(gid) {
      return deps.downloader.status(gid)
    },
    async refresh() {
      const result = await coordinator.refresh()
      await discover()
      return result
    },
  }
}
