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
    // Only `add` reads this: pages are always fetched fresh.
    let lastPage = [];
    async function fetchPage(keyword, page) {
        const source = (deps.makeSource ?? (() => deps.source))(keyword, page);
        lastPage = dedupeCandidates(await source.listCandidates());
        return lastPage;
    }
    return {
        search: (keyword, page) => fetchPage(keyword, page),
        listCandidates: page => fetchPage('', page),
        async add(candidateId) {
            let candidate = lastPage.find(entry => entry.id === candidateId);
            if (candidate === undefined) {
                await fetchPage('', 1);
                candidate = lastPage.find(entry => entry.id === candidateId);
            }
            if (candidate === undefined)
                throw new UnknownCandidateError(candidateId);
            return coordinator.submit(candidate);
        },
        status(gid) {
            return deps.downloader.status(gid);
        },
        refresh() {
            return coordinator.refresh();
        },
    };
}
//# sourceMappingURL=service.js.map