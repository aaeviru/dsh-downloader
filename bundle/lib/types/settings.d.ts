import type { CategoryOption, EffectiveSettings, SourceKind } from './catalog.ts';
export type { EffectiveSettings } from './catalog.ts';
/** Identify a feed provider by hostname; malformed URLs are unknown. */
export declare function sourceKind(feedUrl: string): SourceKind;
/** Return category choices only for supported Sukebei feeds. */
export declare function categoriesFor(kind: SourceKind): readonly CategoryOption[];
/** Validate an HTTP(S) endpoint without userinfo, matching the Config pattern. */
export declare function isValidEndpoint(value: string): boolean;
/** Resolve explicit valid filters, then legacy URL values, then defaults. */
export declare function resolveSettings(input: {
    readonly endpoint: string;
    readonly feedUrl: string;
    readonly qualityFilter?: string;
    readonly category?: string;
}): EffectiveSettings;
/** Build a request with at most one q/f/c and provider-appropriate filters. */
export declare function buildFeedUrl(feedUrl: string, kind: SourceKind, settings: EffectiveSettings, keyword?: string): string;
/** Classify connection failures without exposing server diagnostics or secrets. */
export declare function classifyConnectionFailure(error: unknown): 'auth' | 'timeout' | 'unreachable' | 'protocol';
//# sourceMappingURL=settings.d.ts.map