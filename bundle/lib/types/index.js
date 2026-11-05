import { DownloadRemote } from "./remote.js";
import { createDownloadTools } from "./tools.js";
export { resolveStorePath } from "./remote.js";
export const Config = DownloadRemote.Config;
export const name = 'dsh-downloader';
export const inject = ['tools', 'credentials', 'typert'];
/** Register the shared Remote service and tools in the owning host scope. */
export function apply(ctx, config) {
    const remote = new DownloadRemote(ctx, config);
    for (const tool of createDownloadTools(remote.service, { clock: () => new Date() })) {
        ctx.effect(() => ctx.tools.register(tool));
    }
}
//# sourceMappingURL=index.js.map