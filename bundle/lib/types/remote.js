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
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
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
    let _search_decorators;
    let _list_decorators;
    let _add_decorators;
    let _status_decorators;
    let _refresh_decorators;
    return class DownloadRemote extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _search_decorators = [Remote('search')];
            _list_decorators = [Remote('list')];
            _add_decorators = [Remote('add')];
            _status_decorators = [Remote('status')];
            _refresh_decorators = [Remote('refresh')];
            __esDecorate(this, null, _search_decorators, { kind: "method", name: "search", static: false, private: false, access: { has: obj => "search" in obj, get: obj => obj.search }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _add_decorators, { kind: "method", name: "add", static: false, private: false, access: { has: obj => "add" in obj, get: obj => obj.add }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _refresh_decorators, { kind: "method", name: "refresh", static: false, private: false, access: { has: obj => "refresh" in obj, get: obj => obj.refresh }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['typert', 'credentials'];
        static Config = z.object({
            endpoint: z.string().default('http://10.0.0.7:8082/jsonrpc'),
            tokenRef: z.string().default('ARIA2_TOKEN'),
            timeoutMs: z.number().min(1).default(15000),
            storePath: z.string().default('downloader/submissions.json'),
            feedUrl: z.string().default('https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2'),
        });
        /** The service the tools and the Remote methods share. */
        service = __runInitializers(this, _instanceExtraInitializers);
        constructor(ctx, config) {
            super(ctx, 'download', { namespace: 'download' });
            const storeReady = createPersistentSubmitStore(createJsonFileSubmitStoreBackend(resolveStorePath(config.storePath)));
            const ready = storeReady.then((store) => {
                const client = async () => createAria2Client({
                    endpoint: config.endpoint, timeoutMs: config.timeoutMs,
                    token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null,
                });
                return createDownloadService({
                    store,
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
            // Observe hydration failures through the host lifecycle as well as callers.
            ctx.effect(async () => {
                await ready;
                const store = await storeReady;
                return () => store.flush();
            });
            this.service = {
                search: async (keyword) => (await ready).search(keyword),
                listCandidates: async () => (await ready).listCandidates(),
                add: async (candidateId) => (await ready).add(candidateId),
                status: async (gid) => (await ready).status(gid),
                refresh: async () => (await ready).refresh(),
            };
        }
        search(keyword) {
            return this.service.search(keyword);
        }
        list() {
            return this.service.listCandidates();
        }
        add(candidateId) {
            return this.service.add(candidateId);
        }
        status(gid) {
            return this.service.status(gid);
        }
        refresh() {
            return this.service.refresh();
        }
    };
})();
export { DownloadRemote };
//# sourceMappingURL=remote.js.map