import { dedupeCandidates } from "./candidate.js";
import { createDownloadCoordinator } from "./coordinator.js";
export class UnknownCandidateError extends Error {
    candidateId;
    constructor(candidateId) {
        super(`Unknown candidate: ${candidateId}`);
        this.name = 'UnknownCandidateError';
        this.candidateId = candidateId;
    }
}
/** Create the service over the three injected seams. */
export function createDownloadService(deps) {
    const coordinator = createDownloadCoordinator(deps);
    let cache;
    async function discover() {
        cache = dedupeCandidates(await deps.source.listCandidates());
        return cache;
    }
    return {
        async search(keyword) {
            const candidates = await discover();
            return candidates.filter(candidate => candidate.title.toLowerCase().includes(keyword.toLowerCase()));
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
        status(gid) {
            return deps.downloader.status(gid);
        },
        async refresh() {
            const result = await coordinator.refresh();
            await discover();
            return result;
        },
    };
}
//# sourceMappingURL=service.js.map