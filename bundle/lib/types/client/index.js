import downloadRemote from '@deepseek-ai/dsh-experimental-downloader/remote';
import { mountDownloader } from "./mount.js";
/** Services required by the browser plugin. */
export const inject = ['remote', 'slots', 'locale'];
/** Mount the generated transport and UI, releasing both on failure or unload. */
export async function apply(ctx) {
    const transport = ctx.plugin(async (owner) => { await owner.remote.$mount(downloadRemote); });
    const ui = ctx.inject(['remote.download', 'slots', 'locale'], (scope) => {
        mountDownloader(scope, scope.remote.download);
    });
    const dispose = ctx.effect(function* () {
        yield transport.dispose;
        yield ui.dispose;
    }, 'dsh-downloader: mount');
    try {
        await Promise.all([transport, ui]);
    }
    catch (error) {
        await dispose();
        throw error;
    }
    return dispose;
}
//# sourceMappingURL=index.js.map