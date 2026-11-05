import type { Candidate } from './candidate.ts';
export declare class RssParseError extends Error {
    readonly code: 'not-xml' | 'no-channel';
    constructor(code: 'not-xml' | 'no-channel', options?: ErrorOptions);
}
export declare function parseRssFeed(xml: string, options: {
    sourceId: string;
}): readonly Candidate[];
//# sourceMappingURL=rss.d.ts.map