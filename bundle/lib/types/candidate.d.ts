export interface Candidate {
    readonly id: string;
    readonly sourceId: string;
    readonly title: string;
    readonly publishedAt: string | null;
    readonly infoHash: string | null;
    readonly magnetUri: string | null;
    readonly torrentUrl: string | null;
    readonly sizeBytes: number | null;
    readonly sourceUrl: string;
    readonly submittable: boolean;
    readonly dedupeKey: string;
}
export declare function normalizeInfoHash(raw: string | null | undefined): string | null;
export declare function dedupeCandidates(list: readonly Candidate[]): readonly Candidate[];
//# sourceMappingURL=candidate.d.ts.map