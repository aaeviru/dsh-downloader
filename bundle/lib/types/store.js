/** Hydrate from the backend, then persist after each accepted record. */
export async function createPersistentSubmitStore(backend) {
    const records = new Map((await backend.load()).map(record => [record.key, { ...record }]));
    let queue = Promise.resolve();
    const failures = [];
    const list = () => [...records.values()].map(record => ({ ...record }));
    return {
        has: key => records.has(key),
        list,
        record(key, gid) {
            records.set(key, { key, gid });
            const snapshot = list();
            queue = queue.then(() => backend.save(snapshot)).catch((error) => { failures.push(error); });
        },
        async flush() {
            // Include saves appended while a flush is waiting, until the queue drains.
            let pending;
            do {
                pending = queue;
                await pending;
            } while (pending !== queue);
            // Report the first failure once per drained batch, including undefined rejections.
            if (failures.length > 0) {
                const [first] = failures.splice(0);
                throw first;
            }
        },
    };
}
//# sourceMappingURL=store.js.map