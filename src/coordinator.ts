/** Coordinate candidate submission with recorded keys and per-instance in-flight protection. */
import { dedupeCandidates } from './candidate.ts'
import type { Candidate } from './candidate.ts'

export interface Source {
  listCandidates(): Promise<readonly Candidate[]>
}

export interface Downloader {
  add(candidate: Candidate): Promise<{ gid: string }>
  status(gid: string): Promise<{ state: string }>
}

export interface SubmitRecord {
  readonly key: string
  readonly gid: string
}

export interface SubmitStore {
  has(key: string): boolean
  record(key: string, gid: string): void
  list(): readonly SubmitRecord[]
}

export interface RefreshResult {
  readonly discovered: number
  readonly added: number
  readonly skipped: number
  readonly unsubmittable: number
}

export type SubmitResult =
  | { readonly gid: string }
  | { readonly alreadySubmitted: string }
  | { readonly alreadySubmitting: true }
  | { readonly unsubmittable: true }

export interface DownloadCoordinator {
  refresh(): Promise<RefreshResult>
  submit(candidate: Candidate): Promise<SubmitResult>
}

/** Create a coordinator over the three injected seams. */
export function createDownloadCoordinator(deps: {
  readonly source: Source
  readonly downloader: Downloader
  readonly store: SubmitStore
}): DownloadCoordinator {
  const { source, downloader, store } = deps
  const inFlight = new Map<string, true>()

  async function submit(candidate: Candidate): Promise<SubmitResult> {
    if (!candidate.submittable) return { unsubmittable: true }
    const key = candidate.dedupeKey
    if (store.has(key)) {
      // The typed store exposes lookup through list(); has() guarantees a record.
      const record = store.list().find(record => record.key === key) as SubmitRecord
      return { alreadySubmitted: record.gid }
    }
    if (inFlight.has(key)) return { alreadySubmitting: true }
    inFlight.set(key, true)
    try {
      const { gid } = await downloader.add(candidate)
      store.record(key, gid)
      return { gid }
    } finally {
      inFlight.delete(key)
    }
  }

  async function refresh(): Promise<RefreshResult> {
    const candidates = dedupeCandidates(await source.listCandidates())
    let added = 0
    let skipped = 0
    let unsubmittable = 0
    for (const candidate of candidates) {
      const result = await submit(candidate)
      if ('gid' in result) added++
      else if ('unsubmittable' in result) unsubmittable++
      else skipped++
    }
    return { discovered: candidates.length, added, skipped, unsubmittable }
  }

  return { refresh, submit }
}
