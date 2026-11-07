/** Host-owned search keywords, persisted independently from download submissions. */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
/**
 * Create an atomic, owner-readable JSON backend.
 * @param path - Destination; missing files load empty and malformed files reject.
 * @returns The file backend; failed writes reject and temporary files are removed.
 */
export function createJsonFilePreferencesBackend(path) {
    return {
        async load() {
            let contents;
            try {
                contents = await readFile(path, 'utf8');
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    return { history: [], favorites: [] };
                throw error;
            }
            const value = JSON.parse(contents);
            const keywords = (items) => Array.isArray(items)
                && items.every((item) => typeof item === 'string' && item.length > 0 && item.trim() === item)
                && new Set(items).size === items.length;
            if (typeof value !== 'object' || value === null || !('history' in value) || !('favorites' in value)
                || !keywords(value.history) || !keywords(value.favorites) || value.history.length > 50) {
                throw new Error(`Invalid preferences at ${path}: expected unique history and favorite keywords`);
            }
            return { history: value.history, favorites: value.favorites };
        },
        async save(value) {
            await mkdir(dirname(path), { recursive: true });
            const temporary = `${path}.${randomUUID()}.tmp`;
            try {
                await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
                await rename(temporary, path);
            }
            finally {
                await rm(temporary, { force: true });
            }
        },
    };
}
/**
 * Hydrate preferences without writing during load.
 * @param backend - Durable storage; failed mutations leave the committed value intact.
 * @returns A serialized store; mutations and flush reject on persistence failure.
 */
export async function openPreferencesStore(backend) {
    const freeze = (value) => Object.freeze({
        history: Object.freeze([...value.history]), favorites: Object.freeze([...value.favorites]),
    });
    let value = freeze(await backend.load());
    let pending = Promise.resolve();
    function update(change) {
        const operation = pending.catch(() => { }).then(async () => {
            const next = freeze(change(value));
            await backend.save(next);
            value = next;
            return value;
        });
        pending = operation.then(() => { });
        void pending.catch(() => { });
        return operation;
    }
    return {
        get value() { return value; },
        addSearch(keyword) {
            const key = keyword.trim();
            return key ? update(current => ({ ...current, history: [key, ...current.history.filter(item => item !== key)].slice(0, 50) })) : Promise.resolve(value);
        },
        toggleFavorite(keyword) {
            const key = keyword.trim();
            return key ? update(current => ({ ...current, favorites: current.favorites.includes(key)
                    ? current.favorites.filter(item => item !== key) : [key, ...current.favorites] })) : Promise.resolve(value);
        },
        deleteSearch(keyword) { return update(current => ({ ...current, history: current.history.filter(item => item !== keyword.trim()) })); },
        clearHistory() { return update(current => ({ ...current, history: [] })); },
        flush() { return pending; },
    };
}
//# sourceMappingURL=preferences.js.map