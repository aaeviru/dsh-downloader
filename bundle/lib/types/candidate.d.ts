export interface Candidate {
    readonly id: string;
    readonly sourceId: string;
    readonly title: string;
    readonly publishedAt: string | null;
    readonly infoHash: string | null;
    readonly magnetUri: string | null;
    readonly torrentUrl: string | null;
    readonly sizeBytes: number | null;
    /** Swarm seeders when the feed reports them. */
    readonly seeders?: number | null;
    /** Swarm leechers when the feed reports them. */
    readonly leechers?: number | null;
    /** Completed downloads when the feed reports them. */
    readonly downloads?: number | null;
    readonly sourceUrl: string;
    readonly submittable: boolean;
    readonly dedupeKey: string;
}
export declare function normalizeInfoHash(raw: string | null | undefined): string | null;
export declare function dedupeCandidates(list: readonly Candidate[]): readonly Candidate[];
//# sourceMappingURL=candidate.d.ts.map