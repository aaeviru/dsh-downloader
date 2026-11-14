/** Public boundary types for the Remote namespace. */
export type { Candidate } from './candidate.ts';
export type { SubmitRecord, SubmitResult } from './coordinator.ts';
export type { RefreshResult } from './service.ts';
/** Exact keywords in newest-first order. */
export interface Preferences {
    readonly history: readonly string[];
    readonly favorites: readonly string[];
}
/** Persistence failures reject; callers must retain the last committed value. */
export interface PreferencesBackend {
    load(): Promise<Preferences>;
    save(value: Preferences): Promise<void>;
}
/** Serialized mutations publish only after persistence succeeds. */
export interface PreferencesStore {
    readonly value: Preferences;
    addSearch(keyword: string): Promise<Preferences>;
    toggleFavorite(keyword: string): Promise<Preferences>;
    deleteSearch(keyword: string): Promise<Preferences>;
    clearHistory(): Promise<Preferences>;
    flush(): Promise<void>;
}
/** Shared provider and filter vocabulary. */
export type { CategoryOption, QualityFilter, CategoryCode, SourceKind, EffectiveSettings } from './catalog.ts';
import type { SourceKind, CategoryOption, EffectiveSettings } from './catalog.ts';
/** Provider choices and the current resolved settings, without credentials. */
export interface SettingsInfo {
    readonly source: {
        readonly kind: SourceKind;
        readonly categories: readonly CategoryOption[];
    };
    readonly effective: EffectiveSettings;
}
/** Safe result of probing a staged endpoint without changing settings. */
export type TestConnectionResult = {
    readonly ok: true;
    readonly version: string;
} | {
    readonly ok: false;
    readonly reason: 'invalid' | 'auth' | 'timeout' | 'unreachable' | 'protocol';
};
//# sourceMappingURL=types.d.ts.map