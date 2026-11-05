/** Coordinate candidate submission with recorded keys and per-instance in-flight protection. */
import { dedupeCandidates } from "./candidate.js";
/** Create a coordinator over the three injected seams. */
export function createDownloadCoordinator(deps) {
    const { source, downloader, store } = deps;
    const inFlight = new Map();
    async function submit(candidate) {
        if (!candidate.submittable)
            return { unsubmittable: true };
        const key = candidate.dedupeKey;
        if (store.has(key)) {
            const record = store.list().find(record => record.key === key);
            if (record === undefined)
                throw new Error(`SubmitStore has key "${key}" but no matching record`);
            return { alreadySubmitted: record.gid };
        }
        if (inFlight.has(key))
            return { alreadySubmitting: true };
        inFlight.set(key, true);
        try {
            const { gid } = await downloader.add(candidate);
            store.record(key, gid);
            return { gid };
        }
        finally {
            inFlight.delete(key);
        }
    }
    async function refresh() {
        const candidates = dedupeCandidates(await source.listCandidates());
        let added = 0;
        let skipped = 0;
        let unsubmittable = 0;
        for (const candidate of candidates) {
            const result = await submit(candidate);
            if ('gid' in result)
                added++;
            else if ('unsubmittable' in result)
                unsubmittable++;
            else
                skipped++;
        }
        return { discovered: candidates.length, added, skipped, unsubmittable };
    }
    return { refresh, submit };
}
//# sourceMappingURL=coordinator.js.map