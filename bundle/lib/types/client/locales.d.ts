/** Panel dictionary namespace. */
export declare const NS = "downloader";
/** English panel copy. */
export declare const en: {
    readonly settings: "Settings";
    readonly settingsSummary: "aria2, filters and category";
    readonly settingsUnavailable: "Settings are unavailable for this plugin.";
    readonly settingsLoading: "Loading settings…";
    readonly settingsReadOnly: "This profile does not accept settings changes.";
    readonly uploadFilter: "Upload filter";
    readonly filter0: "No filter";
    readonly filter1: "No remakes";
    readonly filter2: "Trusted only";
    readonly category: "Category";
    readonly endpoint: "aria2 endpoint";
    readonly endpointHelp: "Full http(s) JSON-RPC URL, for example http://10.0.0.7:8082/jsonrpc.";
    readonly invalidEndpoint: "Enter a full http(s) URL without credentials.";
    readonly testConnection: "Test connection";
    readonly testing: "Testing…";
    readonly testSucceeded: "Connected. aria2 {version}.";
    readonly testAuth: "Authentication failed. Check the credential reference.";
    readonly testTimeout: "Timed out.";
    readonly testUnreachable: "Cannot reach the aria2 server.";
    readonly testProtocol: "The server did not answer the aria2 protocol.";
    readonly save: "Save";
    readonly saving: "Saving…";
    readonly cancel: "Cancel";
    readonly saved: "Settings saved.";
    readonly saveFailed: "Could not save settings. Review the values and retry.";
    readonly saveConflict: "Settings changed elsewhere. Review the reloaded values and retry.";
    readonly sourceUnsupported: "This feed is not Sukebei; upload filter and category settings are disabled.";
    readonly 'category.0_0': "All";
    readonly 'category.1_0': "Art — all";
    readonly 'category.1_1': "Art — Anime";
    readonly 'category.1_2': "Art — Doujinshi";
    readonly 'category.1_3': "Art — Games";
    readonly 'category.1_4': "Art — Manga";
    readonly 'category.1_5': "Art — Pictures";
    readonly 'category.2_0': "Real Life — all";
    readonly 'category.2_1': "Real Life — Photobooks";
    readonly 'category.2_2': "Real Life — Videos";
    readonly savedSearches: "Saved searches";
    readonly favorites: "Favorites";
    readonly recent: "Recent searches";
    readonly favorite: "Favorite";
    readonly unfavorite: "Unfavorite";
    readonly deleteSearch: "Delete search";
    readonly clearHistory: "Clear history";
    readonly noSavedSearches: "No saved searches yet.";
    readonly preferencesError: "Unable to save or load search preferences. Retry loading preferences.";
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
    readonly resubmit: "Re-download";
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