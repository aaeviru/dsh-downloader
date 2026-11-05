import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { SyntaxValidator } from "fast-xml-validator";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/aria2.js
var Aria2Error = class extends Error {};
var Aria2AuthError = class extends Aria2Error {};
var Aria2TimeoutError = class extends Aria2Error {};
var Aria2ProtocolError = class extends Aria2Error {
	status;
	bodyPreview;
	constructor(message, status, bodyPreview) {
		super(message);
		this.status = status;
		this.bodyPreview = bodyPreview;
	}
};
function record(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error();
	return value;
}
function string(value) {
	if (typeof value !== "string") throw new Error();
	return value;
}
function length(value) {
	if (value === void 0) return null;
	const raw = string(value);
	if (!/^\d+$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error();
	return Number(raw);
}
const fetchTransport = (request) => fetch(request.url, {
	method: "POST",
	headers: request.headers,
	body: request.body,
	signal: request.signal
});
/** Create a client. `transport` defaults to a thin wrapper over global fetch. */
function createAria2Client(config, transport = fetchTransport) {
	const { endpoint, timeoutMs } = config;
	const token = config.token === "" ? null : config.token;
	let id = 0;
	const sanitize = (value) => {
		while (token && value.includes(token)) value = value.split(token).join("");
		return value;
	};
	async function call(method, args, parse) {
		const controller = new AbortController();
		let status = 0;
		let body = "";
		let timer;
		const deadline = new Promise((_resolve, reject) => {
			timer = setTimeout(() => {
				controller.abort();
				reject(new Aria2TimeoutError(sanitize(method)));
			}, timeoutMs);
		});
		try {
			const requestId = ++id;
			const operation = async () => {
				const response = await transport({
					url: endpoint,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: requestId,
						method,
						params: token === null ? args : [`token:${token}`, ...args]
					}),
					signal: controller.signal
				});
				status = response.status;
				body = await response.text();
				if (!response.ok) throw new Error();
				const envelope = record(JSON.parse(body));
				if (envelope.jsonrpc !== "2.0" || envelope.id !== requestId) throw new Error();
				if (envelope.error !== void 0) {
					if (record(envelope.error).code === 1) throw new Aria2AuthError(sanitize(method));
					throw new Error();
				}
				return parse(envelope.result);
			};
			return await Promise.race([operation(), deadline]);
		} catch (error) {
			if (controller.signal.aborted) throw new Aria2TimeoutError(sanitize(method));
			if (error instanceof Aria2AuthError) throw error;
			throw new Aria2ProtocolError(sanitize(method), status, Buffer.from(sanitize(body), "utf8").subarray(0, 200).toString("utf8"));
		} finally {
			clearTimeout(timer);
		}
	}
	return {
		getVersion: () => call("aria2.getVersion", [], (value) => {
			const result = record(value);
			const features = result.enabledFeatures ?? [];
			if (!Array.isArray(features)) throw new Error();
			return {
				version: string(result.version),
				enabledFeatures: features.map(string)
			};
		}),
		addUri: (uris, options) => call("aria2.addUri", options === void 0 ? [uris] : [uris, options], (value) => ({ gid: string(value) })),
		tellStatus: (gid) => call("aria2.tellStatus", [gid], (value) => {
			const result = record(value);
			const followedBy = result.followedBy === void 0 ? [] : result.followedBy;
			if (!Array.isArray(followedBy)) throw new Error();
			return {
				gid: string(result.gid),
				status: string(result.status),
				followedBy: followedBy.map(string),
				totalLength: length(result.totalLength),
				completedLength: length(result.completedLength),
				errorMessage: result.errorMessage === void 0 ? null : string(result.errorMessage)
			};
		})
	};
}
//#endregion
//#region lib/types/candidate.js
function normalizeInfoHash(raw) {
	if (typeof raw !== "string") return null;
	if (/^[a-f0-9]{40}$/i.test(raw)) return raw.toLowerCase();
	if (!/^[a-z2-7]{32}$/i.test(raw)) return null;
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
	const bits = raw.toUpperCase().split("").map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
	let hex = "";
	for (let offset = 0; offset < bits.length; offset += 8) hex += Number.parseInt(bits.slice(offset, offset + 8), 2).toString(16).padStart(2, "0");
	return hex;
}
function dedupeCandidates(list) {
	const seen = /* @__PURE__ */ new Set();
	return list.filter((candidate) => {
		if (seen.has(candidate.dedupeKey)) return false;
		seen.add(candidate.dedupeKey);
		return true;
	});
}
//#endregion
//#region lib/types/coordinator.js
/** Coordinate candidate submission with recorded keys and per-instance in-flight protection. */
/** Create a coordinator over the three injected seams. */
function createDownloadCoordinator(deps) {
	const { source, downloader, store } = deps;
	const inFlight = /* @__PURE__ */ new Map();
	async function submit(candidate) {
		if (!candidate.submittable) return { unsubmittable: true };
		const key = candidate.dedupeKey;
		if (store.has(key)) {
			const record = store.list().find((record) => record.key === key);
			if (record === void 0) throw new Error(`SubmitStore has key "${key}" but no matching record`);
			return { alreadySubmitted: record.gid };
		}
		if (inFlight.has(key)) return { alreadySubmitting: true };
		inFlight.set(key, true);
		try {
			const { gid } = await downloader.add(candidate);
			store.record(key, gid);
			return { gid };
		} finally {
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
			if ("gid" in result) added++;
			else if ("unsubmittable" in result) unsubmittable++;
			else skipped++;
		}
		return {
			discovered: candidates.length,
			added,
			skipped,
			unsubmittable
		};
	}
	return {
		refresh,
		submit
	};
}
//#endregion
//#region lib/types/service.js
var UnknownCandidateError = class extends Error {
	candidateId;
	constructor(candidateId) {
		super(`Unknown candidate: ${candidateId}`);
		this.name = "UnknownCandidateError";
		this.candidateId = candidateId;
	}
};
/** Create the service over the three injected seams. */
function createDownloadService(deps) {
	const coordinator = createDownloadCoordinator(deps);
	let cache;
	async function discover() {
		cache = dedupeCandidates(await deps.source.listCandidates());
		return cache;
	}
	return {
		async search(keyword) {
			cache = dedupeCandidates(await (deps.makeSource ?? (() => deps.source))(keyword).listCandidates());
			return cache;
		},
		async listCandidates() {
			return cache ?? discover();
		},
		async add(candidateId) {
			const candidate = (!cache || cache.length === 0 ? await discover() : cache).find((candidate) => candidate.id === candidateId);
			if (!candidate) throw new UnknownCandidateError(candidateId);
			return coordinator.submit(candidate);
		},
		status(gid) {
			return deps.downloader.status(gid);
		},
		async refresh() {
			const result = await coordinator.refresh();
			await discover();
			return result;
		}
	};
}
//#endregion
//#region lib/types/rss.js
var RssParseError = class extends Error {
	code;
	constructor(code, options) {
		super(code, options);
		this.name = "RssParseError";
		this.code = code;
	}
};
function field(value, key) {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) return value[key];
}
function text(value) {
	const content = typeof value === "string" ? value : field(value, "#text");
	return typeof content === "string" && content !== "" ? content : null;
}
function list(value) {
	return Array.isArray(value) ? value : [value];
}
function count(value) {
	const raw = text(value);
	if (raw === null || !/^\d+$/.test(raw)) return null;
	return Number(raw);
}
function size(value) {
	const match = /^(\d+(?:\.\d+)?)\s*(b|kib|mib|gib|tib)$/i.exec(value ?? "");
	if (!match) return null;
	const amount = Number(match[1]);
	const unit = String(match[2]).toLowerCase();
	const bytes = Math.round(amount * 1024 ** [
		"b",
		"kib",
		"mib",
		"gib",
		"tib"
	].indexOf(unit));
	return Number.isFinite(bytes) ? bytes : null;
}
function date(value) {
	const timestamp = Date.parse(value ?? "");
	return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}
function candidate(item, sourceId) {
	const links = list(field(item, "link"));
	const alternate = links.find((link) => field(link, "@_rel") === "alternate");
	const link = text(field(item, "link")) ?? text(field(alternate, "@_href"));
	const sourceUrl = link ?? text(field(item, "guid")) ?? text(field(item, "id"));
	if (sourceUrl === null) return null;
	const magnetUri = link?.startsWith("magnet:?") ? link : null;
	const torrentUrl = [
		link,
		...list(field(item, "enclosure")).map((entry) => text(field(entry, "@_url"))),
		...links.filter((entry) => field(entry, "@_rel") === "enclosure").map((entry) => text(field(entry, "@_href")))
	].find((url) => url?.endsWith(".torrent")) ?? null;
	const infoHash = new URLSearchParams((magnetUri ?? "").slice(8)).getAll("xt").filter((value) => /^urn:btih:/i.test(value)).map((value) => normalizeInfoHash(value.slice(9))).find((value) => value !== null) ?? null ?? normalizeInfoHash(text(field(item, "nyaa:infoHash"))) ?? normalizeInfoHash(text(field(item, "torrent:infoHash")));
	const dedupeKey = infoHash === null ? `url:${sourceUrl}` : `ih:${infoHash}`;
	return {
		id: `${sourceId}:${dedupeKey}`,
		sourceId,
		title: text(field(item, "title")) ?? "",
		publishedAt: date(text(field(item, "pubDate")) ?? text(field(item, "published")) ?? text(field(item, "updated"))),
		infoHash,
		magnetUri,
		torrentUrl,
		sizeBytes: size(text(field(item, "nyaa:size"))),
		seeders: count(field(item, "nyaa:seeders")),
		leechers: count(field(item, "nyaa:leechers")),
		downloads: count(field(item, "nyaa:downloads")),
		sourceUrl,
		submittable: magnetUri !== null || torrentUrl !== null,
		dedupeKey
	};
}
function parseRssFeed(xml, options) {
	try {
		SyntaxValidator.validate(xml);
	} catch (cause) {
		throw new RssParseError("not-xml", { cause });
	}
	const root = new XMLParser({
		ignoreAttributes: false,
		parseTagValue: false
	}).parse(xml);
	const atom = field(root, "feed");
	const rdf = field(root, "rdf:RDF");
	const channel = field(field(root, "rss") ?? rdf, "channel");
	if (atom === void 0 && channel === void 0) throw new RssParseError("no-channel");
	const container = atom ?? rdf ?? channel;
	const items = [...list(field(container, "item")), ...list(field(container, "entry"))];
	const candidates = [];
	for (const item of items) {
		const parsed = candidate(item, options.sourceId);
		if (parsed !== null) candidates.push(parsed);
	}
	return dedupeCandidates(candidates);
}
//#endregion
//#region lib/types/source.js
/** A feed that could not be retrieved. */
var FeedFetchError = class extends Error {
	status;
	constructor(status) {
		super(`Feed request failed with status ${status}`);
		this.name = "FeedFetchError";
		this.status = status;
	}
};
const defaultTransport = (url, signal) => fetch(url, { signal });
/**
* Build a candidate source over one RSS feed.
* @param options - feed address, request timeout, and an optional transport override.
* @returns a source that fetches the feed and returns normalized, deduplicated candidates.
*/
function createRssSource(options) {
	const transport = options.transport ?? defaultTransport;
	const sourceId = new URL(options.feedUrl).host;
	const requestUrl = () => {
		if (options.keyword === void 0 || options.keyword.trim() === "") return options.feedUrl;
		const url = new URL(options.feedUrl);
		url.searchParams.set("q", options.keyword);
		return url.toString();
	};
	return { async listCandidates() {
		const controller = new AbortController();
		const timer = setTimeout(() => {
			controller.abort();
		}, options.timeoutMs);
		try {
			const response = await transport(requestUrl(), controller.signal);
			if (!response.ok) throw new FeedFetchError(response.status);
			return dedupeCandidates(parseRssFeed(await response.text(), { sourceId }));
		} finally {
			clearTimeout(timer);
		}
	} };
}
//#endregion
//#region lib/types/store.js
/** Hydrate from the backend, then persist after each accepted record. */
async function createPersistentSubmitStore(backend) {
	const records = new Map((await backend.load()).map((record) => [record.key, { ...record }]));
	let queue = Promise.resolve();
	const failures = [];
	const list = () => [...records.values()].map((record) => ({ ...record }));
	return {
		has: (key) => records.has(key),
		list,
		record(key, gid) {
			records.set(key, {
				key,
				gid
			});
			const snapshot = list();
			queue = queue.then(() => backend.save(snapshot)).catch((error) => {
				failures.push(error);
			});
		},
		async flush() {
			let pending;
			do {
				pending = queue;
				await pending;
			} while (pending !== queue);
			if (failures.length > 0) {
				const [first] = failures.splice(0);
				throw first;
			}
		}
	};
}
//#endregion
//#region lib/types/store-json.js
/** Backend storing submit records as a JSON document at `path`. */
function createJsonFileSubmitStoreBackend(path) {
	return {
		async load() {
			let contents;
			try {
				contents = await readFile(path, "utf8");
			} catch (error) {
				if (error.code === "ENOENT") return [];
				throw error;
			}
			try {
				const value = JSON.parse(contents);
				if (!Array.isArray(value)) throw new Error();
				return value.map((record) => {
					if (typeof record !== "object" || record === null || !("key" in record) || !("gid" in record) || typeof record.key !== "string" || typeof record.gid !== "string") throw new Error();
					return {
						key: record.key,
						gid: record.gid
					};
				});
			} catch {
				throw new Error(`Invalid submit store at ${path}: expected a JSON array of { key: string, gid: string } records`);
			}
		},
		async save(records) {
			await mkdir(dirname(path), { recursive: true });
			const temporary = `${path}.${randomUUID()}.tmp`;
			try {
				await writeFile(temporary, JSON.stringify(records), {
					mode: 384,
					flag: "wx"
				});
				await rename(temporary, path);
				await chmod(path, 384);
			} finally {
				await rm(temporary, { force: true });
			}
		}
	};
}
//#endregion
//#region lib/types/remote.js
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Resolve the submission store path.
* @param storePath - absolute path, or one relative to the harness home.
* @param env - environment carrying an optional `DSH_HOME` override.
* @returns the absolute store path.
*/
function resolveStorePath(storePath, env = process.env) {
	return resolve(env.DSH_HOME ?? join(homedir(), ".dsh"), storePath);
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
			_search_decorators = [Remote("search")];
			_list_decorators = [Remote("list")];
			_add_decorators = [Remote("add")];
			_status_decorators = [Remote("status")];
			_refresh_decorators = [Remote("refresh")];
			__esDecorate(this, null, _search_decorators, {
				kind: "method",
				name: "search",
				static: false,
				private: false,
				access: {
					has: (obj) => "search" in obj,
					get: (obj) => obj.search
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _add_decorators, {
				kind: "method",
				name: "add",
				static: false,
				private: false,
				access: {
					has: (obj) => "add" in obj,
					get: (obj) => obj.add
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _status_decorators, {
				kind: "method",
				name: "status",
				static: false,
				private: false,
				access: {
					has: (obj) => "status" in obj,
					get: (obj) => obj.status
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _refresh_decorators, {
				kind: "method",
				name: "refresh",
				static: false,
				private: false,
				access: {
					has: (obj) => "refresh" in obj,
					get: (obj) => obj.refresh
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["typert", "credentials"];
		static Config = z.object({
			endpoint: z.string().default("http://10.0.0.7:8082/jsonrpc"),
			tokenRef: z.string().default("ARIA2_TOKEN"),
			timeoutMs: z.number().min(1).default(15e3),
			storePath: z.string().default("downloader/submissions.json"),
			feedUrl: z.string().default("https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=0")
		});
		/** The service the tools and the Remote methods share. */
		service = __runInitializers(this, _instanceExtraInitializers);
		constructor(ctx, config) {
			super(ctx, "download", { namespace: "download" });
			const storeReady = createPersistentSubmitStore(createJsonFileSubmitStoreBackend(resolveStorePath(config.storePath)));
			const ready = storeReady.then((store) => {
				const client = async () => createAria2Client({
					endpoint: config.endpoint,
					timeoutMs: config.timeoutMs,
					token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null
				});
				return createDownloadService({
					store,
					source: createRssSource({
						feedUrl: config.feedUrl,
						timeoutMs: config.timeoutMs
					}),
					makeSource: (keyword) => createRssSource({
						feedUrl: config.feedUrl,
						keyword,
						timeoutMs: config.timeoutMs
					}),
					downloader: {
						async add(candidate) {
							const uri = candidate.torrentUrl ?? candidate.magnetUri;
							if (uri === null) throw new Error("Download candidate has neither a torrent URL nor a magnet URI");
							return (await client()).addUri([uri]);
						},
						async status(gid) {
							return { state: (await (await client()).tellStatus(gid)).status };
						}
					}
				});
			});
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
				refresh: async () => (await ready).refresh()
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
//#endregion
//#region lib/types/tools.js
/** Build the three model tools over a service instance. */
function createDownloadTools(service, options) {
	return [
		defineTool({
			name: "download_search",
			description: "Search download candidates by title.",
			parameters: { keyword: {
				type: "string",
				required: true
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: { candidates: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {
									type: "string",
									required: true
								},
								title: {
									type: "string",
									required: true
								},
								submittable: {
									type: "boolean",
									required: true
								},
								sizeBytes: {
									oneOf: [{ type: "number" }, { type: "null" }],
									required: true
								},
								infoHash: {
									oneOf: [{ type: "string" }, { type: "null" }],
									required: true
								}
							}
						}
					} }
				},
				render: (_args, value) => [{
					type: "text",
					text: `Found ${value.candidates.length} candidates.`
				}]
			},
			async execute({ keyword }) {
				return { candidates: (await service.search(keyword)).map(({ id, title, submittable, sizeBytes, infoHash }) => ({
					id,
					title,
					submittable,
					sizeBytes,
					infoHash
				})) };
			}
		}),
		defineTool({
			name: "download_add",
			description: "Submit a cached download candidate.",
			parameters: { candidateId: {
				type: "string",
				required: true
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						candidateId: {
							type: "string",
							required: true
						},
						outcome: {
							type: "string",
							required: true,
							enum: [
								"added",
								"alreadySubmitted",
								"alreadySubmitting",
								"unsubmittable"
							]
						},
						gid: {
							oneOf: [{ type: "string" }, { type: "null" }],
							required: true
						},
						triggeredAt: {
							type: "string",
							required: true
						},
						callId: {
							type: "string",
							required: true
						}
					}
				},
				render: (_args, value) => [{
					type: "text",
					text: `Download submission: ${value.outcome}.`
				}]
			},
			async execute({ candidateId }, exec) {
				const triggeredAt = options.clock().toISOString();
				const result = await service.add(candidateId);
				if ("gid" in result) return {
					candidateId,
					outcome: "added",
					gid: result.gid,
					triggeredAt,
					callId: exec.callId
				};
				if ("alreadySubmitted" in result) return {
					candidateId,
					outcome: "alreadySubmitted",
					gid: result.alreadySubmitted,
					triggeredAt,
					callId: exec.callId
				};
				return {
					candidateId,
					outcome: "alreadySubmitting" in result ? "alreadySubmitting" : "unsubmittable",
					gid: null,
					triggeredAt,
					callId: exec.callId
				};
			}
		}),
		defineTool({
			name: "download_status",
			description: "Get the status of a download.",
			parameters: { gid: {
				type: "string",
				required: true
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						gid: {
							type: "string",
							required: true
						},
						state: {
							type: "string",
							required: true
						}
					}
				},
				render: (_args, value) => [{
					type: "text",
					text: `Download status: ${value.state}.`
				}]
			},
			async execute({ gid }) {
				const { state } = await service.status(gid);
				return {
					gid,
					state
				};
			}
		})
	];
}
//#endregion
//#region lib/types/index.js
const Config = DownloadRemote.Config;
const name = "dsh-downloader";
const inject = [
	"tools",
	"credentials",
	"typert"
];
/** Register the shared Remote service and tools in the owning host scope. */
function apply(ctx, config) {
	const remote = new DownloadRemote(ctx, config);
	for (const tool of createDownloadTools(remote.service, { clock: () => /* @__PURE__ */ new Date() })) ctx.effect(() => ctx.tools.register(tool));
}
//#endregion
export { Config, apply, inject, name, resolveStorePath };
