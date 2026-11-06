import type { Context } from '@deepseek-ai/cordis';
import type { DownloadNamespace } from './namespace.ts';
/**
 * Register localized downloader seats with context-owned cleanup.
 * @param ctx - Client context owning the locale dictionaries and slot registrations.
 * @param download - Download operations injected into the downloader panel.
 */
export declare function mountDownloader(ctx: Context, download: DownloadNamespace): void;
//# sourceMappingURL=mount.d.ts.map