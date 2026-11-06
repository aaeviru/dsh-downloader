/**
 * Create a coordinator over the downloader and submission store.
 * @param deps - Downloader and accepted-submission store; failures propagate to callers.
 * @returns A coordinator that records successful submissions and prevents duplicate in-flight work within this instance.
 */
export function createDownloadCoordinator(deps) {
    const { downloader, store } = deps;
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
    return { submit };
}
//# sourceMappingURL=coordinator.js.map