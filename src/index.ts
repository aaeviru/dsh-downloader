/**
 * Downloader plugin entry for DeepSeek Harness.
 *
 * Mount through an overlay under apps/web/tests/ while developing.
 *
 * @module @deepseek-ai/dsh-experimental-downloader
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createAria2Client } from './aria2.ts'
import { createDownloadService } from './service.ts'
import { createPersistentSubmitStore } from './store.ts'
import { createJsonFileSubmitStoreBackend } from './store-json.ts'
import { createDownloadTools } from './tools.ts'

export const name = 'dsh-downloader'
export const inject = ['tools', 'credentials'] as const

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
}

export const Config: z<Config> = z.object({
  endpoint: z.string().default('http://10.0.0.7:8082/jsonrpc'),
  tokenRef: z.string().default('ARIA2_TOKEN'),
  timeoutMs: z.number().min(1).default(15000),
  storePath: z.string().default('downloader/submissions.json'),
})

/** Register downloader tools in the owning host scope. */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(async () => {
    // Cordis exposes `baseUrl`, not a file path; durable plugin data follows
    // the harness home used by the other local backends.
    const path = resolveStorePath(config.storePath)
    const store = await createPersistentSubmitStore(createJsonFileSubmitStoreBackend(path))
    const client = async () => createAria2Client({
      endpoint: config.endpoint, timeoutMs: config.timeoutMs,
      token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null,
    })
    const service = createDownloadService({
      store,
      // RSS wiring arrives in the next step; discovery is explicitly empty for now.
      source: { listCandidates: () => Promise.resolve([]) },
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
    for (const tool of createDownloadTools(service, { clock: () => new Date() })) {
      ctx.effect(() => ctx.tools.register(tool))
    }
    return () => store.flush()
  })
}
