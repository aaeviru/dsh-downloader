/** Panel dictionary namespace. */
export declare const NS = "downloader";
/** English panel copy. */
export declare const en: {
    readonly panel: "Downloader";
    readonly description: "Browse and submit download candidates.";
    readonly refresh: "Refresh";
    readonly search: "Search";
    readonly title: "Title";
    readonly size: "Size";
    readonly loading: "Loading…";
    readonly empty: "No download candidates yet.";
    readonly error: "Unable to load downloads.";
    readonly retry: "Retry";
    readonly submit: "Submit";
    readonly submitting: "Submitting…";
    readonly submitted: "Submitted: {gid}";
    readonly alreadySubmitted: "Previously submitted: {gid}";
    readonly alreadySubmitting: "Already submitting.";
    readonly unsubmittable: "Cannot submit this candidate.";
    readonly submitError: "Unable to submit this candidate.";
    readonly unknownSize: "Unknown size";
    readonly published: "Published";
    readonly seeders: "Seeders";
    readonly leechers: "Leechers";
    readonly downloads: "Downloads";
};
/** Typed panel dictionary keys. */
export type DownloaderKey = keyof typeof en;
/** Chinese panel copy. */
export declare const zh: Record<keyof typeof en, string>;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Downloader panel and sidebar copy. */
        downloader: DownloaderKey;
    }
}
//# sourceMappingURL=locales.d.ts.map