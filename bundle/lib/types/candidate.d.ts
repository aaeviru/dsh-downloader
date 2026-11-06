/** Feed entry with nullable metadata and a deduplication key shared by equivalent download targets. */
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
/**
 * Normalize a hexadecimal or base32 BitTorrent info hash.
 * @param raw - A 40-digit hexadecimal or 32-character base32 hash, without surrounding whitespace.
 * @returns The lowercase hexadecimal hash, or null for absent or invalid input.
 */
export declare function normalizeInfoHash(raw: string | null | undefined): string | null;
/**
 * Retain the first candidate for each deduplication key without mutating the input.
 * @param list - Candidates in preferred retention order.
 * @returns A new array retaining original candidate objects and their relative order.
 */
export declare function dedupeCandidates(list: readonly Candidate[]): readonly Candidate[];
//# sourceMappingURL=candidate.d.ts.map