/** Recognized RSS providers. */
export type SourceKind = 'sukebei' | 'nyaa' | 'unknown';
/** Category code and client locale key. */
export interface CategoryOption {
    readonly code: string;
    readonly label: string;
}
/** Supported quality filters. */
export declare const QUALITY_FILTERS: readonly ["0", "1", "2"];
/** One supported quality filter. */
export type QualityFilter = typeof QUALITY_FILTERS[number];
/** Supported Sukebei category codes. */
export declare const SUKEBEI_CODES: readonly ["0_0", "1_0", "1_1", "1_2", "1_3", "1_4", "1_5", "2_0", "2_1", "2_2"];
/** One supported category code. */
export type CategoryCode = typeof SUKEBEI_CODES[number];
/** Resolved live settings, including legacy feed defaults. */
export interface EffectiveSettings {
    readonly endpoint: string;
    readonly qualityFilter: QualityFilter;
    readonly category: CategoryCode;
}
/** Categories with locale keys shared by Host and client. */
export declare const SUKEBEI_CATEGORIES: readonly CategoryOption[];
/** Config schema category choices. */
export declare const CATEGORY_CODES: readonly CategoryCode[];
//# sourceMappingURL=catalog.d.ts.map