/** Supported quality filters. */
export const QUALITY_FILTERS = ['0', '1', '2'];
/** Supported Sukebei category codes. */
export const SUKEBEI_CODES = ['0_0', '1_0', '1_1', '1_2', '1_3', '1_4', '1_5', '2_0', '2_1', '2_2'];
/** Categories with locale keys shared by Host and client. */
export const SUKEBEI_CATEGORIES = SUKEBEI_CODES.map(code => ({ code, label: `category.${code}` }));
/** Config schema category choices. */
export const CATEGORY_CODES = SUKEBEI_CODES;
//# sourceMappingURL=catalog.js.map