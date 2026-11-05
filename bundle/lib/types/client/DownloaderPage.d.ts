/** One row the page can show. */
export interface CandidateRow {
    readonly id: string;
    readonly title: string;
    readonly sizeBytes: number | null;
    readonly submittable: boolean;
}
/** Copy the page renders. */
export interface DownloaderCopy {
    readonly title: string;
    readonly description: string;
    readonly loading: string;
    readonly empty: string;
    readonly refresh: string;
    readonly submit: string;
    readonly submitted: string;
    readonly status: string;
    readonly error: string;
}
/** Host calls the page needs. */
export interface DownloaderActions {
    readonly list: () => Promise<readonly CandidateRow[]>;
    readonly add: (candidateId: string) => Promise<{
        gid: string;
        outcome: string;
    }>;
    readonly status: (gid: string) => Promise<string>;
}
/**
 * Render the candidate list with loading, empty, error, and submitted states.
 * @param props - localized copy plus the host actions.
 * @returns The downloader page.
 */
export declare function DownloaderPage({ copy, actions }: {
    copy: DownloaderCopy;
    actions: DownloaderActions;
}): import("react").JSX.Element;
//# sourceMappingURL=DownloaderPage.d.ts.map