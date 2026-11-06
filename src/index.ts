/** Downloader plugin entry for DeepSeek Harness. */
import type { Context } from '@deepseek-ai/cordis'
import type { Config } from './config.ts'
import { DownloadRemote } from './remote.ts'
import { createDownloadTools } from './tools.ts'

export { Config } from './config.ts'
export { resolveStorePath } from './remote.ts'

/** Loader plugin name. */
export const name = 'dsh-downloader'
/** Host services required by the plugin. */
export const inject = ['tools', 'credentials', 'typert']

/**
 * Register the shared Remote service and tools in the owning host scope.
 * @param ctx - Host scope providing tools, credentials, and Typert.
 * @param config - Resolved downloader settings.
 */
export function apply(ctx: Context, config: Config): void {
  const remote = new DownloadRemote(ctx, config)
  for (const tool of createDownloadTools(remote.service, { clock: () => new Date() })) {
    ctx.effect(() => ctx.tools.register(tool))
  }
}
