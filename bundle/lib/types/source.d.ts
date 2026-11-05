import type { Source } from './coordinator.ts';
/** One HTTP response as the RSS source consumes it. */
export interface FeedResponse {
    readonly ok: boolean;
    readonly status: number;
    text(): Promise<string>;
}
/** Fetch seam; the default implementation wraps global `fetch`. */
export type FeedTransport = (url: string, signal: AbortSignal) => Promise<FeedResponse>;
/** A feed that could not be retrieved. */
export declare class FeedFetchError extends Error {
    readonly status: number;
    constructor(status: number);
}
export interface RssSourceOptions {
    readonly feedUrl: string;
    readonly timeoutMs: number;
    readonly transport?: FeedTransport;
}
/**
 * Build a candidate source over one RSS feed.
 * @param options - feed address, request timeout, and an optional transport override.
 * @returns a source that fetches the feed and returns normalized, deduplicated candidates.
 */
export declare function createRssSource(options: RssSourceOptions): Source;
//# sourceMappingURL=source.d.ts.map