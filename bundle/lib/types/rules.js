/**
 * Choose which candidates this round may submit. Pure; never mutates its input.
 * @param candidates - Candidates in selection priority order.
 * @param config - Keyword matches, round limit, and automatic-submission switch.
 * @returns Matching candidates up to the limit, or an empty array when disabled or the limit is nonpositive.
 */
export function selectForSubmission(candidates, config) {
    if (!config.autoSubmit || config.maxPerRound <= 0)
        return [];
    const keywords = config.keywords.map(keyword => keyword.toLowerCase());
    return candidates.filter(candidate => keywords.some(keyword => candidate.title.toLowerCase().includes(keyword)))
        .slice(0, config.maxPerRound);
}
//# sourceMappingURL=rules.js.map