import type { SubmitStoreBackend } from './store.ts';
/**
 * Backend storing submit records as a JSON document at `path`.
 * @param path - Destination file; missing files load as empty, while malformed contents reject.
 * @returns A backend that replaces the file through a temporary file and applies owner-only permissions.
 */
export declare function createJsonFileSubmitStoreBackend(path: string): SubmitStoreBackend;
//# sourceMappingURL=store-json.d.ts.map