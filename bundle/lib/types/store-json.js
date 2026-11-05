import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
/** Backend storing submit records as a JSON document at `path`. */
export function createJsonFileSubmitStoreBackend(path) {
    return {
        async load() {
            let contents;
            try {
                contents = await readFile(path, 'utf8');
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    return [];
                throw error;
            }
            try {
                const value = JSON.parse(contents);
                if (!Array.isArray(value))
                    throw new Error();
                return value.map((record) => {
                    if (typeof record !== 'object' || record === null || !('key' in record) || !('gid' in record)
                        || typeof record.key !== 'string' || typeof record.gid !== 'string')
                        throw new Error();
                    return { key: record.key, gid: record.gid };
                });
            }
            catch {
                throw new Error(`Invalid submit store at ${path}: expected a JSON array of { key: string, gid: string } records`);
            }
        },
        async save(records) {
            await mkdir(dirname(path), { recursive: true });
            const temporary = `${path}.${randomUUID()}.tmp`;
            try {
                await writeFile(temporary, JSON.stringify(records), { mode: 0o600, flag: 'wx' });
                await rename(temporary, path);
                await chmod(path, 0o600);
            }
            finally {
                await rm(temporary, { force: true });
            }
        },
    };
}
//# sourceMappingURL=store-json.js.map