import type { DownloaderKey } from './locales.ts';
import type { DownloadNamespace } from './namespace.ts';
type Translate = (key: DownloaderKey) => string;
/** Render loading, empty, candidate and recoverable error states. */
export declare function DownloaderPanel({ t, download }: {
    t: Translate;
    download: DownloadNamespace;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=DownloaderPanel.d.ts.map