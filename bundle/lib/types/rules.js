/** Choose which candidates this round may submit. Pure; never mutates its input. */
export function selectForSubmission(candidates, config) {
    if (!config.autoSubmit || config.maxPerRound <= 0)
        return [];
    const keywords = config.keywords.map(keyword => keyword.toLowerCase());
    return candidates.filter(candidate => keywords.some(keyword => candidate.title.toLowerCase().includes(keyword)))
        .slice(0, config.maxPerRound);
}
//# sourceMappingURL=rules.js.map