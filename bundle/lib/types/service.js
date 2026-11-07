import { dedupeCandidates } from "./candidate.js";
import { createDownloadCoordinator } from "./coordinator.js";
/** The requested identifier is absent from the candidate set available to the service. */
export class UnknownCandidateError extends Error {
    /** Requested identifier that could not be resolved for submission. */
    candidateId;
    constructor(candidateId) {
        super(`Unknown candidate: ${candidateId}`);
        this.name = 'UnknownCandidateError';
        this.candidateId = candidateId;
    }
}
/**
 * Create the service over the three injected seams.
 * @param deps - Discovery, optional keyword-scoped discovery, downloader, and submission storage providers.
 * @returns A service with a private candidate cache; unknown submission identifiers reject with UnknownCandidateError.
 */
export function createDownloadService(deps) {
    const coordinator = createDownloadCoordinator(deps);
    let source = deps.source;
    let cache;
    async function discover() {
        cache = dedupeCandidates(await source.listCandidates());
        return cache;
    }
    return {
        async preferences() { return deps.preferences.value; },
        recordSearch: keyword => deps.preferences.addSearch(keyword),
        toggleFavorite: keyword => deps.preferences.toggleFavorite(keyword),
        deleteSearch: keyword => deps.preferences.deleteSearch(keyword),
        clearHistory: () => deps.preferences.clearHistory(),
        async search(keyword) {
            keyword = keyword.trim();
            if (!keyword)
                return [];
            source = deps.makeSource ? deps.makeSource(keyword) : deps.source;
            return discover();
        },
        async listCandidates() {
            return cache ?? discover();
        },
        async add(candidateId) {
            const candidates = !cache || cache.length === 0 ? await discover() : cache;
            const candidate = candidates.find(candidate => candidate.id === candidateId);
            if (!candidate)
                throw new UnknownCandidateError(candidateId);
            return coordinator.submit(candidate);
        },
        submissions() {
            return deps.store.list();
        },
        async resubmit(candidateId) {
            const candidate = cache?.find(candidate => candidate.id === candidateId)
                ?? (await discover()).find(candidate => candidate.id === candidateId);
            if (!candidate)
                throw new UnknownCandidateError(candidateId);
            return coordinator.resubmit(candidate);
        },
        status(gid) {
            return deps.downloader.status(gid);
        },
        async refresh() {
            const candidates = await discover();
            return {
                candidates,
                discovered: candidates.length,
                known: candidates.filter(candidate => deps.store.has(candidate.dedupeKey)).length,
                unsubmittable: candidates.filter(candidate => !candidate.submittable).length,
            };
        },
    };
}
//# sourceMappingURL=service.js.map