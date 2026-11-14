import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import type { DownloaderKey } from './locales.ts';
import type { DownloadNamespace } from './namespace.ts';
type Translate = (key: DownloaderKey) => string;
/** Configuration contributed only to the downloader's row on the Plugins page. */
export declare function SettingsPage({ view, form, t, download }: PluginConfigViewProps & {
    t: Translate;
    download: DownloadNamespace;
}): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=SettingsPage.d.ts.map