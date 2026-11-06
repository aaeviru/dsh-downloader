import type { Candidate } from './candidate.ts';
/** Feed XML is malformed or lacks a recognized RSS, RDF, or Atom container. */
export declare class RssParseError extends Error {
    /** Distinguishes invalid XML syntax from a missing feed container. */
    readonly code: 'not-xml' | 'no-channel';
    constructor(code: 'not-xml' | 'no-channel', options?: ErrorOptions);
}
/**
 * Parse RSS, RDF, or Atom entries, omitting entries without a source URL and rejecting invalid feeds.
 * @param xml - Feed XML to validate and parse.
 * @param options - Source identifier used to namespace candidate identifiers.
 * @returns Normalized candidates with the first entry retained for each deduplication key.
 */
export declare function parseRssFeed(xml: string, options: {
    sourceId: string;
}): readonly Candidate[];
//# sourceMappingURL=rss.d.ts.map