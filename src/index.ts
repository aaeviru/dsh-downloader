/** Downloader plugin entry for DeepSeek Harness. */
import type { Context } from '@deepseek-ai/cordis'
import { DownloadRemote } from './remote.ts'
import type { Config as DownloadConfig } from './remote.ts'
import { createDownloadTools } from './tools.ts'

export { resolveStorePath } from './remote.ts'
export type Config = DownloadConfig
export const Config = DownloadRemote.Config
export const name = 'dsh-downloader'
export const inject = ['tools', 'credentials', 'typert'] as const

/** Register the shared Remote service and tools in the owning host scope. */
export function apply(ctx: Context, config: Config): void {
  const remote = new DownloadRemote(ctx, config)
  for (const tool of createDownloadTools(remote.service, { clock: () => new Date() })) {
    ctx.effect(() => ctx.tools.register(tool))
  }
}
