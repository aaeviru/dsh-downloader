import type { PreferencesBackend, PreferencesStore } from './types.ts';
export type { Preferences, PreferencesBackend, PreferencesStore } from './types.ts';
/**
 * Create an atomic, owner-readable JSON backend.
 * @param path - Destination; missing files load empty and malformed files reject.
 * @returns The file backend; failed writes reject and temporary files are removed.
 */
export declare function createJsonFilePreferencesBackend(path: string): PreferencesBackend;
/**
 * Hydrate preferences without writing during load.
 * @param backend - Durable storage; failed mutations leave the committed value intact.
 * @returns A serialized store; mutations and flush reject on persistence failure.
 */
export declare function openPreferencesStore(backend: PreferencesBackend): Promise<PreferencesStore>;
//# sourceMappingURL=preferences.d.ts.map