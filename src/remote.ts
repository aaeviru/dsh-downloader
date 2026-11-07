import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type Schema from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { Config } from './config.ts'
import { createAria2Client } from './aria2.ts'
import { createDownloadService } from './service.ts'
import { createRssSource } from './source.ts'
import type { DownloadService } from './service.ts'
import type { Candidate, RefreshResult, SubmitRecord, SubmitResult } from './types.ts'
import { createPersistentSubmitStore } from './store.ts'
import { createJsonFileSubmitStoreBackend } from './store-json.ts'

export type { Config } from './config.ts'

/**
 * Resolve the submission store path.
 * @param storePath - absolute path, or one relative to the harness home.
 * @param env - environment carrying an optional `DSH_HOME` override.
 * @returns the absolute store path.
 */
export function resolveStorePath(storePath: string, env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.DSH_HOME ?? join(homedir(), '.dsh'), storePath)
}

/** Own the download service and its browser namespace. */
export class DownloadRemote extends TypertRemoteService {
  static inject = ['typert', 'credentials']
  /** Mount schema shared with the plugin entry. */
  static get Config(): Schema<Partial<Config>, Config> {
    return Config
  }

  /** The service the tools and the Remote methods share. */
  readonly service: Omit<DownloadService, 'submissions'>

  private readonly ready: Promise<DownloadService>

  constructor(ctx: Context, config: Config) {
    super(ctx, 'download', { namespace: 'download' })
    const storeReady = createPersistentSubmitStore(
      createJsonFileSubmitStoreBackend(resolveStorePath(config.storePath)),
    )
    const ready = storeReady.then((store) => {
      const client = async () => createAria2Client({
        endpoint: config.endpoint, timeoutMs: config.timeoutMs,
        token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null,
      })
      return createDownloadService({
        store,
        // RSS wiring arrives in the next step; discovery is explicitly empty for now.
        source: createRssSource({ feedUrl: config.feedUrl, timeoutMs: config.timeoutMs }),
        makeSource: keyword => createRssSource({ feedUrl: config.feedUrl, keyword, timeoutMs: config.timeoutMs }),
        downloader: {
          async add(candidate) {
            const uri = candidate.torrentUrl ?? candidate.magnetUri
            if (uri === null) throw new Error('Download candidate has neither a torrent URL nor a magnet URI')
            return (await client()).addUri([uri])
          },
          async status(gid) {
            return { state: (await (await client()).tellStatus(gid)).status }
          },
        },
      })
    })
    this.ready = ready
    // Observe hydration failures through the host lifecycle as well as callers.
    ctx.effect(async () => {
      await ready
      const store = await storeReady
      return () => store.flush()
    })
    this.service = {
      search: async keyword => (await ready).search(keyword),
      listCandidates: async () => (await ready).listCandidates(),
      resubmit: async candidateId => (await ready).resubmit(candidateId),
      add: async candidateId => (await ready).add(candidateId),
      status: async gid => (await ready).status(gid),
      refresh: async () => (await ready).refresh(),
    }
  }

  /**
   * Search candidates through the service for one keyword.
   * @param keyword - text matched against candidate titles.
   * @returns the matching candidates after deduplication.
   */
  @Remote('search')
  search(keyword: string): Promise<readonly Candidate[]> {
    return this.service.search(keyword)
  }

  /**
   * List the cached candidates, discovering them on first use.
   * @returns the current candidate set.
   */
  @Remote('list')
  list(): Promise<readonly Candidate[]> {
    return this.service.listCandidates()
  }

  /**
   * Submit one cached candidate to aria2.
   * @param candidateId - identifier from the current candidate set.
   * @returns the submission outcome, GID, timestamp, and call ID.
   */
  @Remote('add')
  add(candidateId: string): Promise<SubmitResult> {
    return this.service.add(candidateId)
  }

  /**
   * Read accepted submissions after store hydration.
   * @returns Records keyed by candidate dedupe key.
   */
  @Remote('submissions')
  async submissions(): Promise<readonly SubmitRecord[]> {
    return (await this.ready).submissions()
  }

  /**
   * Explicitly submit a candidate again, preserving its old record on failure.
   * @param candidateId - Candidate identifier resolved by the service.
   * @returns The new gid or a pending/unsupported outcome.
   */
  @Remote('resubmit')
  resubmit(candidateId: string): Promise<SubmitResult> {
    return this.service.resubmit(candidateId)
  }

  /**
   * Read the state of one aria2 download.
   * @param gid - aria2 download identifier returned by a submission.
   * @returns the aria2-reported state for that GID.
   */
  @Remote('status')
  status(gid: string): Promise<{ state: string }> {
    return this.service.status(gid)
  }

  /**
   * Rediscover the last executed query without submitting downloads.
   * @returns the candidates and discovery counts; source failure preserves the previous cache.
   */
  @Remote('refresh')
  refresh(): Promise<RefreshResult> {
    return this.service.refresh()
  }
}
