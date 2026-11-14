import type { Preferences, PreferencesStore } from './types.ts'
import { dedupeCandidates } from './candidate.ts'
import type { Candidate } from './candidate.ts'
import { createDownloadCoordinator } from './coordinator.ts'
import type { Downloader, Source, SubmitRecord, SubmitResult, SubmitStore } from './coordinator.ts'

/** Read-only discovery results; known counts keys already recorded in the submission store. */
export interface RefreshResult {
  readonly candidates: readonly Candidate[]
  readonly discovered: number
  readonly known: number
  readonly unsubmittable: number
}

/** The requested identifier is absent from the candidate set available to the service. */
export class UnknownCandidateError extends Error {
  /** Requested identifier that could not be resolved for submission. */
  readonly candidateId: string

  constructor(candidateId: string) {
    super(`Unknown candidate: ${candidateId}`)
    this.name = 'UnknownCandidateError'
    this.candidateId = candidateId
  }
}

function safeEndpoint(value: string): string {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch { return '[invalid endpoint]' }
}

/** Status cannot be queried on a different aria2 server. */
export class CrossEndpointError extends Error {
  constructor(gid: string, recorded: string, current: string) {
    super(`GID "${gid}" was submitted to ${safeEndpoint(recorded)} but the current aria2 endpoint is ${safeEndpoint(current)}; status is unavailable. Restore the original endpoint to query it.`)
    this.name = 'CrossEndpointError'
  }
}

/** Old records cannot safely identify the aria2 server that accepted them. */
export class LegacySubmitRecordError extends Error {
  constructor(gid: string) {
    super(`GID "${gid}" has no recorded aria2 endpoint; status is unavailable. Check the original aria2 server directly or explicitly resubmit the candidate.`)
    this.name = 'LegacySubmitRecordError'
  }
}

/** Caches discovered candidates for identifier-based submission; search replaces the cache and refresh reloads it. */
export interface DownloadService {
  /** Read committed keywords without discovery or submission. */
  preferences(): Promise<Preferences>
  /** Record a successfully executed keyword; blank input is ignored. */
  recordSearch(keyword: string): Promise<Preferences>
  /** Toggle an exact keyword without executing it. */
  toggleFavorite(keyword: string): Promise<Preferences>
  /** Remove one history keyword without changing favorites. */
  deleteSearch(keyword: string): Promise<Preferences>
  /** Remove history while retaining favorites. */
  clearHistory(): Promise<Preferences>
  search(keyword: string): Promise<readonly Candidate[]>
  listCandidates(): Promise<readonly Candidate[]>
  add(candidateId: string): Promise<SubmitResult>
  /**
   * Read accepted submissions.
   * @returns Store records keyed by candidate dedupe key.
   */
  submissions(): readonly SubmitRecord[]
  /**
   * Submit again, replacing the record only on success.
   * @param candidateId - Identifier from the last discovery; a miss triggers one fresh discovery.
   * @returns The submission outcome; unknown identifiers reject with UnknownCandidateError.
   */
  resubmit(candidateId: string): Promise<SubmitResult>
  status(gid: string): Promise<{ state: string }>
  /** Reload the last executed query once; failure preserves the cache and submission records. */
  refresh(): Promise<RefreshResult>
}

/**
 * Create the service over the three injected seams.
 * @param deps - Discovery, optional keyword-scoped discovery, downloader, and submission storage providers.
 * @returns A service with a private candidate cache; unknown submission identifiers reject with UnknownCandidateError.
 */
export function createDownloadService(deps: {
  readonly source: Source
  /** Build a source scoped to one search keyword; defaults to the configured source. */
  readonly makeSource?: (keyword: string) => Source
  readonly downloader: Downloader
  readonly preferences: PreferencesStore
  readonly store: SubmitStore
  readonly currentEndpoint?: () => string
  readonly tag?: () => string
}): DownloadService {
  const coordinator = createDownloadCoordinator({ ...deps, endpoint: () => deps.currentEndpoint?.() })
  let source = deps.source
  let cache: { tag: string; candidates: readonly Candidate[] } | undefined
  let keyword: string | undefined

  function invalidate(): void {
    if (cache && cache.tag !== (deps.tag?.() ?? '')) {
      cache = undefined
      source = keyword !== undefined && deps.makeSource ? deps.makeSource(keyword) : deps.source
    }
  }

  async function discover(): Promise<readonly Candidate[]> {
    const tag = deps.tag?.() ?? ''
    const candidates = dedupeCandidates(await source.listCandidates())
    cache = { tag, candidates }
    return candidates
  }

  return {
    async preferences() { return deps.preferences.value },
    recordSearch: keyword => deps.preferences.addSearch(keyword),
    toggleFavorite: keyword => deps.preferences.toggleFavorite(keyword),
    deleteSearch: keyword => deps.preferences.deleteSearch(keyword),
    clearHistory: () => deps.preferences.clearHistory(),
    async search(value) {
      invalidate()
      value = value.trim()
      if (!value) return []
      keyword = value
      source = deps.makeSource ? deps.makeSource(keyword) : deps.source
      return discover()
    },
    async listCandidates() {
      invalidate()
      return cache?.candidates ?? discover()
    },
    async add(candidateId) {
      const candidates = !cache || cache.candidates.length === 0 ? await discover() : cache.candidates
      const candidate = candidates.find(candidate => candidate.id === candidateId)
      if (!candidate) throw new UnknownCandidateError(candidateId)
      return coordinator.submit(candidate)
    },
    submissions() {
      return deps.store.list()
    },
    async resubmit(candidateId) {
      const candidate = cache?.candidates.find(candidate => candidate.id === candidateId)
        ?? (await discover()).find(candidate => candidate.id === candidateId)
      if (!candidate) throw new UnknownCandidateError(candidateId)
      return coordinator.resubmit(candidate)
    },
    async status(gid) {
      const record = deps.store.list().find(record => record.gid === gid)
      if (record) {
        if (record.endpoint === undefined) throw new LegacySubmitRecordError(gid)
        if (deps.currentEndpoint) {
          const current = deps.currentEndpoint()
          if (record.endpoint !== current) throw new CrossEndpointError(gid, record.endpoint, current)
        }
      }
      return deps.downloader.status(gid)
    },
    async refresh() {
      invalidate()
      const candidates = await discover()
      return {
        candidates,
        discovered: candidates.length,
        known: candidates.filter(candidate => deps.store.has(candidate.dedupeKey)).length,
        unsubmittable: candidates.filter(candidate => !candidate.submittable).length,
      }
    },
  }
}
