import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import z from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createAria2Client } from './aria2.ts'
import { createDownloadService } from './service.ts'
import { createRssSource } from './source.ts'
import type { Source } from './coordinator.ts'
import type { DownloadService } from './service.ts'
import type { Candidate, RefreshResult, SubmitResult } from './types.ts'
import { createPersistentSubmitStore } from './store.ts'
import { createJsonFileSubmitStoreBackend } from './store-json.ts'

/**
 * Resolve the submission store path.
 * @param storePath - absolute path, or one relative to the harness home.
 * @param env - environment carrying an optional `DSH_HOME` override.
 * @returns the absolute store path.
 */
export function resolveStorePath(storePath: string, env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.DSH_HOME ?? join(homedir(), '.dsh'), storePath)
}

export interface Config {
  endpoint: string
  tokenRef: string
  timeoutMs: number
  storePath: string
  feedBase: string
  pageSize: number
}

/**
 * Build the feed source factory the service uses for every page request.
 * @param config - feed address, page size, and request timeout.
 * @returns a factory taking one keyword and one page number.
 */
export function feedSource(config: Pick<Config, 'feedBase' | 'pageSize' | 'timeoutMs'>): (keyword: string, page: number) => Source {
  return (keyword, page) => createRssSource({ feedBase: config.feedBase, page, limit: config.pageSize, keyword, timeoutMs: config.timeoutMs })
}

/** Own the download service and its browser namespace. */
export class DownloadRemote extends TypertRemoteService {
  static inject = ['typert', 'credentials']
  static Config: z<Config> = z.object({
    endpoint: z.string().default('http://10.0.0.7:8082/jsonrpc'),
    tokenRef: z.string().default('ARIA2_TOKEN'),
    timeoutMs: z.number().min(1).default(15000),
    storePath: z.string().default('downloader/submissions.json'),
    feedBase: z.string().default('https://sukebei.nyaa.net/feed/magnet'),
    pageSize: z.number().min(1).max(300).default(100),
  })

  /** The service the tools and the Remote methods share. */
  readonly service: DownloadService

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
        source: feedSource(config)('', 1),
        makeSource: feedSource(config),
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
    // Observe hydration failures through the host lifecycle as well as callers.
    ctx.effect(async () => {
      await ready
      const store = await storeReady
      return () => store.flush()
    })
    this.service = {
      search: async (keyword, page) => (await ready).search(keyword, page),
      listCandidates: async page => (await ready).listCandidates(page),
      add: async candidateId => (await ready).add(candidateId),
      status: async gid => (await ready).status(gid),
      refresh: async () => (await ready).refresh(),
    }
  }

  @Remote('search')
  search(keyword: string, page: number): Promise<readonly Candidate[]> {
    return this.service.search(keyword, page)
  }

  @Remote('list')
  list(page: number): Promise<readonly Candidate[]> {
    return this.service.listCandidates(page)
  }

  @Remote('add')
  add(candidateId: string): Promise<SubmitResult> {
    return this.service.add(candidateId)
  }

  @Remote('status')
  status(gid: string): Promise<{ state: string }> {
    return this.service.status(gid)
  }

  @Remote('refresh')
  refresh(): Promise<RefreshResult> {
    return this.service.refresh()
  }
}
