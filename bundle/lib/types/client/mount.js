import { SettingsPage } from "./SettingsPage.js";
import { DownloaderPanel } from "./DownloaderPanel.js";
import { DownloaderIcon } from "./DownloaderIcon.js";
import { NS, en, zh } from "./locales.js";
/**
 * Register localized downloader seats with context-owned cleanup.
 * @param ctx - Client context owning the locale dictionaries and slot registrations.
 * @param download - Download operations injected into the downloader panel.
 */
export function mountDownloader(ctx, download) {
    ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-downloader: dictionaries');
    const t = ctx.locale.bind(NS);
    ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'downloader', locale: NS, inject: () => ({ t, download }),
    }, DownloaderPanel));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'downloader', order: 40, locale: NS, label: () => t('panel'),
    }, DownloaderIcon));
    const ROW_KEY = '@deepseek-ai/dsh-experimental-downloader#downloader';
    ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config', key: ROW_KEY, locale: NS, inject: () => ({ t, download }),
    }, SettingsPage));
}
//# sourceMappingURL=mount.js.map