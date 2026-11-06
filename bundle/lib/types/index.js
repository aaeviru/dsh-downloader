import { DownloadRemote } from "./remote.js";
import { createDownloadTools } from "./tools.js";
export { Config } from "./config.js";
export { resolveStorePath } from "./remote.js";
/** Loader plugin name. */
export const name = 'dsh-downloader';
/** Host services required by the plugin. */
export const inject = ['tools', 'credentials', 'typert'];
/**
 * Register the shared Remote service and tools in the owning host scope.
 * @param ctx - Host scope providing tools, credentials, and Typert.
 * @param config - Resolved downloader settings.
 */
export function apply(ctx, config) {
    const remote = new DownloadRemote(ctx, config);
    for (const tool of createDownloadTools(remote.service, { clock: () => new Date() })) {
        ctx.effect(() => ctx.tools.register(tool));
    }
}
//# sourceMappingURL=index.js.map