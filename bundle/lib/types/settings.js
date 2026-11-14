import { QUALITY_FILTERS, SUKEBEI_CODES, SUKEBEI_CATEGORIES } from "./catalog.js";
import { Aria2AuthError, Aria2TimeoutError, Aria2ProtocolError } from "./aria2.js";
/** Identify a feed provider by hostname; malformed URLs are unknown. */
export function sourceKind(feedUrl) {
    try {
        const hostname = new URL(feedUrl).hostname;
        if (hostname === 'sukebei.nyaa.si')
            return 'sukebei';
        if (hostname === 'nyaa.si')
            return 'nyaa';
    }
    catch {
        return 'unknown';
    }
    return 'unknown';
}
/** Return category choices only for supported Sukebei feeds. */
export function categoriesFor(kind) {
    return kind === 'sukebei' ? SUKEBEI_CATEGORIES : [];
}
/** Validate an HTTP(S) endpoint without userinfo, matching the Config pattern. */
export function isValidEndpoint(value) {
    return /^https?:\/\/[^@/?#\s]+(?:\/[^\s]*)?$/.test(value);
}
/** Resolve explicit valid filters, then legacy URL values, then defaults. */
export function resolveSettings(input) {
    let params = new URLSearchParams();
    try {
        params = new URL(input.feedUrl).searchParams;
    }
    catch { /* Invalid feeds have no legacy defaults. */ }
    return {
        endpoint: input.endpoint,
        qualityFilter: QUALITY_FILTERS.find(value => value === input.qualityFilter)
            ?? QUALITY_FILTERS.find(value => value === params.get('f')) ?? '2',
        category: SUKEBEI_CODES.find(value => value === input.category)
            ?? SUKEBEI_CODES.find(value => value === params.get('c')) ?? '0_0',
    };
}
/** Build a request with at most one q/f/c and provider-appropriate filters. */
export function buildFeedUrl(feedUrl, kind, settings, keyword) {
    const url = new URL(feedUrl);
    const query = keyword !== undefined && keyword.trim() !== '' ? keyword : url.searchParams.get('q');
    if (query !== null)
        url.searchParams.set('q', query);
    if (kind === 'unknown')
        url.searchParams.delete('f');
    else
        url.searchParams.set('f', settings.qualityFilter);
    if (kind === 'sukebei')
        url.searchParams.set('c', settings.category);
    else
        url.searchParams.delete('c');
    return url.toString();
}
/** Classify connection failures without exposing server diagnostics or secrets. */
export function classifyConnectionFailure(error) {
    if (error instanceof Aria2AuthError)
        return 'auth';
    if (error instanceof Aria2TimeoutError)
        return 'timeout';
    if (error instanceof Aria2ProtocolError)
        return 'protocol';
    return 'unreachable';
}
//# sourceMappingURL=settings.js.map