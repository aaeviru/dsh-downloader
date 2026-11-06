import { dedupeCandidates } from "./candidate.js";
import { parseRssFeed } from "./rss.js";
/** A feed that could not be retrieved. */
export class FeedFetchError extends Error {
    /** HTTP status returned by the failed feed request. */
    status;
    constructor(status) {
        super(`Feed request failed with status ${status}`);
        this.name = 'FeedFetchError';
        this.status = status;
    }
}
const defaultTransport = (url, signal) => fetch(url, { signal });
/**
 * Build a candidate source over one RSS feed.
 * @param options - feed address, request timeout, and an optional transport override.
 * @returns a source that fetches the feed and returns normalized, deduplicated candidates.
 */
export function createRssSource(options) {
    const transport = options.transport ?? defaultTransport;
    const sourceId = new URL(options.feedUrl).host;
    const requestUrl = () => {
        if (options.keyword === undefined || options.keyword.trim() === '')
            return options.feedUrl;
        const url = new URL(options.feedUrl);
        url.searchParams.set('q', options.keyword);
        return url.toString();
    };
    return {
        async listCandidates() {
            const controller = new AbortController();
            const timer = setTimeout(() => { controller.abort(); }, options.timeoutMs);
            try {
                const response = await transport(requestUrl(), controller.signal);
                if (!response.ok)
                    throw new FeedFetchError(response.status);
                return dedupeCandidates(parseRssFeed(await response.text(), { sourceId }));
            }
            finally {
                clearTimeout(timer);
            }
        },
    };
}
//# sourceMappingURL=source.js.map