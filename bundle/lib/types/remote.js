var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { createJsonFilePreferencesBackend, openPreferencesStore } from "./preferences.js";
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { Config } from "./config.js";
import { createAria2Client } from "./aria2.js";
import { createDownloadService } from "./service.js";
import { createRssSource } from "./source.js";
import { createPersistentSubmitStore } from "./store.js";
import { createJsonFileSubmitStoreBackend } from "./store-json.js";
/**
 * Resolve the submission store path.
 * @param storePath - absolute path, or one relative to the harness home.
 * @param env - environment carrying an optional `DSH_HOME` override.
 * @returns the absolute store path.
 */
export function resolveStorePath(storePath, env = process.env) {
    return resolve(env.DSH_HOME ?? join(homedir(), '.dsh'), storePath);
}
/** Own the download service and its browser namespace. */
let DownloadRemote = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _preferences_decorators;
    let _recordSearch_decorators;
    let _toggleFavorite_decorators;
    let _deleteSearch_decorators;
    let _clearHistory_decorators;
    let _search_decorators;
    let _list_decorators;
    let _add_decorators;
    let _submissions_decorators;
    let _resubmit_decorators;
    let _status_decorators;
    let _refresh_decorators;
    return class DownloadRemote extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _preferences_decorators = [Remote('preferences')];
            _recordSearch_decorators = [Remote('recordSearch')];
            _toggleFavorite_decorators = [Remote('toggleFavorite')];
            _deleteSearch_decorators = [Remote('deleteSearch')];
            _clearHistory_decorators = [Remote('clearHistory')];
            _search_decorators = [Remote('search')];
            _list_decorators = [Remote('list')];
            _add_decorators = [Remote('add')];
            _submissions_decorators = [Remote('submissions')];
            _resubmit_decorators = [Remote('resubmit')];
            _status_decorators = [Remote('status')];
            _refresh_decorators = [Remote('refresh')];
            __esDecorate(this, null, _preferences_decorators, { kind: "method", name: "preferences", static: false, private: false, access: { has: obj => "preferences" in obj, get: obj => obj.preferences }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _recordSearch_decorators, { kind: "method", name: "recordSearch", static: false, private: false, access: { has: obj => "recordSearch" in obj, get: obj => obj.recordSearch }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleFavorite_decorators, { kind: "method", name: "toggleFavorite", static: false, private: false, access: { has: obj => "toggleFavorite" in obj, get: obj => obj.toggleFavorite }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _deleteSearch_decorators, { kind: "method", name: "deleteSearch", static: false, private: false, access: { has: obj => "deleteSearch" in obj, get: obj => obj.deleteSearch }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _clearHistory_decorators, { kind: "method", name: "clearHistory", static: false, private: false, access: { has: obj => "clearHistory" in obj, get: obj => obj.clearHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _search_decorators, { kind: "method", name: "search", static: false, private: false, access: { has: obj => "search" in obj, get: obj => obj.search }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _add_decorators, { kind: "method", name: "add", static: false, private: false, access: { has: obj => "add" in obj, get: obj => obj.add }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _submissions_decorators, { kind: "method", name: "submissions", static: false, private: false, access: { has: obj => "submissions" in obj, get: obj => obj.submissions }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resubmit_decorators, { kind: "method", name: "resubmit", static: false, private: false, access: { has: obj => "resubmit" in obj, get: obj => obj.resubmit }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _refresh_decorators, { kind: "method", name: "refresh", static: false, private: false, access: { has: obj => "refresh" in obj, get: obj => obj.refresh }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['typert', 'credentials'];
        /** Mount schema shared with the plugin entry. */
        static get Config() {
            return Config;
        }
        /** The service the tools and the Remote methods share. */
        service = __runInitializers(this, _instanceExtraInitializers);
        ready;
        constructor(ctx, config) {
            super(ctx, 'download', { namespace: 'download' });
            const storeReady = createPersistentSubmitStore(createJsonFileSubmitStoreBackend(resolveStorePath(config.storePath)));
            const preferencesReady = openPreferencesStore(createJsonFilePreferencesBackend(resolveStorePath('downloader/preferences.json')));
            const ready = Promise.all([storeReady, preferencesReady]).then(([store, preferences]) => {
                const client = async () => createAria2Client({
                    endpoint: config.endpoint, timeoutMs: config.timeoutMs,
                    token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null,
                });
                return createDownloadService({
                    store, preferences,
                    // RSS wiring arrives in the next step; discovery is explicitly empty for now.
                    source: createRssSource({ feedUrl: config.feedUrl, timeoutMs: config.timeoutMs }),
                    makeSource: keyword => createRssSource({ feedUrl: config.feedUrl, keyword, timeoutMs: config.timeoutMs }),
                    downloader: {
                        async add(candidate) {
                            const uri = candidate.torrentUrl ?? candidate.magnetUri;
                            if (uri === null)
                                throw new Error('Download candidate has neither a torrent URL nor a magnet URI');
                            return (await client()).addUri([uri]);
                        },
                        async status(gid) {
                            return { state: (await (await client()).tellStatus(gid)).status };
                        },
                    },
                });
            });
            this.ready = ready;
            // Observe hydration failures through the host lifecycle as well as callers.
            ctx.effect(async () => {
                await ready;
                const store = await storeReady;
                return async () => { await Promise.all([store.flush(), (await preferencesReady).flush()]); };
            });
            this.service = {
                preferences: async () => (await ready).preferences(),
                recordSearch: async (keyword) => (await ready).recordSearch(keyword),
                toggleFavorite: async (keyword) => (await ready).toggleFavorite(keyword),
                deleteSearch: async (keyword) => (await ready).deleteSearch(keyword),
                clearHistory: async () => (await ready).clearHistory(),
                search: async (keyword) => (await ready).search(keyword),
                listCandidates: async () => (await ready).listCandidates(),
                resubmit: async (candidateId) => (await ready).resubmit(candidateId),
                add: async (candidateId) => (await ready).add(candidateId),
                status: async (gid) => (await ready).status(gid),
                refresh: async () => (await ready).refresh(),
            };
        }
        /**
         * Read committed search preferences.
         * @returns Committed preferences; persistence failures reject.
         */
        preferences() {
            return this.service.preferences();
        }
        /**
         * Record a successfully executed search without executing it again.
         * @param keyword - Exact keyword, with surrounding whitespace trimmed.
         * @returns Committed preferences; persistence failures reject.
         */
        recordSearch(keyword) {
            return this.service.recordSearch(keyword);
        }
        /**
         * Toggle a saved keyword without searching or downloading.
         * @param keyword - Exact keyword, with surrounding whitespace trimmed.
         * @returns Committed preferences; persistence failures reject.
         */
        toggleFavorite(keyword) {
            return this.service.toggleFavorite(keyword);
        }
        /**
         * Delete one history keyword while retaining favorites.
         * @param keyword - Exact keyword, with surrounding whitespace trimmed.
         * @returns Committed preferences; persistence failures reject.
         */
        deleteSearch(keyword) {
            return this.service.deleteSearch(keyword);
        }
        /**
         * Clear history while retaining favorites.
         * @returns Committed preferences; persistence failures reject.
         */
        clearHistory() {
            return this.service.clearHistory();
        }
        /**
         * Search candidates through the service for one keyword.
         * @param keyword - text matched against candidate titles.
         * @returns the matching candidates after deduplication.
         */
        search(keyword) {
            return this.service.search(keyword);
        }
        /**
         * List the cached candidates, discovering them on first use.
         * @returns the current candidate set.
         */
        list() {
            return this.service.listCandidates();
        }
        /**
         * Submit one cached candidate to aria2.
         * @param candidateId - identifier from the current candidate set.
         * @returns the submission outcome, GID, timestamp, and call ID.
         */
        add(candidateId) {
            return this.service.add(candidateId);
        }
        /**
         * Read accepted submissions after store hydration.
         * @returns Records keyed by candidate dedupe key.
         */
        async submissions() {
            return (await this.ready).submissions();
        }
        /**
         * Explicitly submit a candidate again, preserving its old record on failure.
         * @param candidateId - Candidate identifier resolved by the service.
         * @returns The new gid or a pending/unsupported outcome.
         */
        resubmit(candidateId) {
            return this.service.resubmit(candidateId);
        }
        /**
         * Read the state of one aria2 download.
         * @param gid - aria2 download identifier returned by a submission.
         * @returns the aria2-reported state for that GID.
         */
        status(gid) {
            return this.service.status(gid);
        }
        /**
         * Rediscover the last executed query without submitting downloads.
         * @returns the candidates and discovery counts; source failure preserves the previous cache.
         */
        refresh() {
            return this.service.refresh();
        }
    };
})();
export { DownloadRemote };
//# sourceMappingURL=remote.js.map