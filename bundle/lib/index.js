import { createRequire } from "node:module";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Context, Service } from "@deepseek-ai/cordis";
import { homedir } from "node:os";
//#region lib/types/preferences.js
/** Host-owned search keywords, persisted independently from download submissions. */
/**
* Create an atomic, owner-readable JSON backend.
* @param path - Destination; missing files load empty and malformed files reject.
* @returns The file backend; failed writes reject and temporary files are removed.
*/
function createJsonFilePreferencesBackend(path) {
	return {
		async load() {
			let contents;
			try {
				contents = await readFile(path, "utf8");
			} catch (error) {
				if (error.code === "ENOENT") return {
					history: [],
					favorites: []
				};
				throw error;
			}
			const value = JSON.parse(contents);
			const keywords = (items) => Array.isArray(items) && items.every((item) => typeof item === "string" && item.length > 0 && item.trim() === item) && new Set(items).size === items.length;
			if (typeof value !== "object" || value === null || !("history" in value) || !("favorites" in value) || !keywords(value.history) || !keywords(value.favorites) || value.history.length > 50) throw new Error(`Invalid preferences at ${path}: expected unique history and favorite keywords`);
			return {
				history: value.history,
				favorites: value.favorites
			};
		},
		async save(value) {
			await mkdir(dirname(path), { recursive: true });
			const temporary = `${path}.${randomUUID()}.tmp`;
			try {
				await writeFile(temporary, JSON.stringify(value), {
					mode: 384,
					flag: "wx"
				});
				await rename(temporary, path);
			} finally {
				await rm(temporary, { force: true });
			}
		}
	};
}
/**
* Hydrate preferences without writing during load.
* @param backend - Durable storage; failed mutations leave the committed value intact.
* @returns A serialized store; mutations and flush reject on persistence failure.
*/
async function openPreferencesStore(backend) {
	const freeze = (value) => Object.freeze({
		history: Object.freeze([...value.history]),
		favorites: Object.freeze([...value.favorites])
	});
	let value = freeze(await backend.load());
	let pending = Promise.resolve();
	function update(change) {
		const operation = pending.catch(() => {}).then(async () => {
			const next = freeze(change(value));
			await backend.save(next);
			value = next;
			return value;
		});
		pending = operation.then(() => {});
		pending.catch(() => {});
		return operation;
	}
	return {
		get value() {
			return value;
		},
		addSearch(keyword) {
			const key = keyword.trim();
			return key ? update((current) => ({
				...current,
				history: [key, ...current.history.filter((item) => item !== key)].slice(0, 50)
			})) : Promise.resolve(value);
		},
		toggleFavorite(keyword) {
			const key = keyword.trim();
			return key ? update((current) => ({
				...current,
				favorites: current.favorites.includes(key) ? current.favorites.filter((item) => item !== key) : [key, ...current.favorites]
			})) : Promise.resolve(value);
		},
		deleteSearch(keyword) {
			return update((current) => ({
				...current,
				history: current.history.filter((item) => item !== keyword.trim())
			}));
		},
		clearHistory() {
			return update((current) => ({
				...current,
				history: []
			}));
		},
		flush() {
			return pending;
		}
	};
}
//#endregion
//#region ../../util/brand/lib/index.js
/**
* Duplicate-install-safe nominal primitive helpers.
*
* A brand makes structurally identical strings or numbers non-interchangeable
* at the type level: a `SessionId` cannot be passed where a `ToolCallId` is
* expected, and an event sequence cannot be passed as a log offset. Comparison,
* logging, and serialization retain the underlying primitive behavior.
*
* This package owns no concrete domain value and keeps no runtime identity or mutable
* state, so independently installed copies produce interchangeable values.
*
* @module @deepseek-ai/dsh-brand
*/
/**
* Apply a compile-time string brand without changing the value.
* @param value - string admitted by the domain that owns the target brand.
* @returns the same string with the requested compile-time brand.
*/
function brandString(value) {
	return value;
}
//#endregion
//#region ../../credentials/credentials/lib/index.js
/**
* Service Definition for the credential-reference capability seam (`ctx.credentials`). Settings and composition files carry
* *references* to secrets — environment-variable names — while providers own
* the actual values and their storage. Consumers resolve a reference once per
* operation, so a changed credential reaches the next operation without any
* plugin restart, and configuration surfaces describe a reference without
* ever seeing its value.
* @module @deepseek-ai/dsh-credentials
*/
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
/**
* Brand a raw string as a {@link CredentialRef}.
* @param value - candidate reference; a POSIX shell identifier such as `DEEPSEEK_API_KEY`.
* @returns the branded reference.
*/
function credentialRef(value) {
	if (!isCredentialRefName(value)) throw new TypeError(`credential ref "${value}" must match ${String(REF_PATTERN)}`);
	return brandString(value);
}
/**
* Whether a raw string could name a reference at all. Consumers that receive
* environment-variable names from somewhere else — a provider library's own
* ambient discovery, a hook payload — ask this before resolving, because a name
* outside the grammar has no reference to miss and should read as "not set"
* rather than as a thrown error.
* @param value - candidate reference.
* @returns true when {@link credentialRef} would accept it.
*/
function isCredentialRefName(value) {
	return REF_PATTERN.test(value);
}
//#endregion
//#region ../../typert/protocol/lib/index.js
/** The one Remote failure class shared by owners, the Gateway, and consumers. */
/**
* One Remote call failure: a real Error carrying its stable code and typed
* details. Owners throw it at the failure point; the Host Gateway encodes it
* onto the wire unchanged; the Client face rebuilds an instance for the
* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
* Discrimination is always by `code`, never by instanceof.
*/
var RemoteError = class extends Error {
	code;
	details;
	/** Structural marker: cross-realm/bundle identification never uses instanceof. */
	isDSHRemoteError = true;
	/**
	* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
	* @param message - human diagnostic carried across the wire.
	* @param details - structured payload typed by the code.
	* @param options - standard Error options (`cause` survives in-process only).
	*/
	constructor(code, message, details, options) {
		super(message, options);
		this.code = code;
		this.details = details;
		this.name = "RemoteError";
	}
};
/**
* Remote decorators and explicit Gateway bindings backed by versioned
* descriptors carried on decorated class prototypes. Strict reflection
* remains a Typert compiler responsibility.
* @module @deepseek-ai/dsh-typert-protocol
*/
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
* Test one generated Remote name against the Connection endpoint grammar.
* @param value - namespace, method, lookup, or Context segment.
* @returns whether the value can cross the shared RPC carrier unchanged.
*/
function isTypertRemoteSegment(value) {
	return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
/**
* Bind one visible Service field to a Cordis key and Remote namespace. A
* service that owns a Cordis Context also gives its tree `ctx.invocation`,
* `undefined` outside a Remote call, so no `TypertRemoteService` is needed for
* a Host composition to read it.
* @param service - owning Service instance, normally `this`.
* @param serviceKey - exact Cordis service key.
* @param options - optional wire namespace.
* @returns a frozen, inspectable binding with no compiler-injected metadata.
*/
function bindTypertRemote(service, serviceKey, options = {}) {
	validateName$1("service key", serviceKey);
	const namespace = options.namespace ?? serviceKey;
	validateName$1("namespace", namespace);
	const ctx = Reflect.get(service, "ctx");
	if (Context.is(ctx)) provideInvocationAccessor(ctx);
	return Object.freeze({
		service,
		serviceKey,
		namespace
	});
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
var TypertRemoteService = class extends Service {
	/** Visible binding consumed by the Gateway's source-mode discovery. */
	typertRemote;
	/**
	* Register the Service and bind the same key to Typert Gateway.
	* @param ctx - owning Cordis Context.
	* @param serviceKey - exact Cordis service key and default wire namespace.
	* @param options - optional wire namespace.
	*/
	constructor(ctx, serviceKey, options = {}) {
		super(ctx, serviceKey);
		this.typertRemote = bindTypertRemote(this, this.name, options);
	}
};
/**
* Make `ctx.invocation` read as `undefined` outside a Remote call instead of the
* reflect service's "cannot get property" error; a call-derived Context shadows
* the accessor with its own property. The first Remote Service constructed in a
* tree registers it on the root, where it outlives any one Service.
*/
function provideInvocationAccessor(ctx) {
	if (Object.hasOwn(ctx.root.reflect.props, "invocation")) return;
	ctx.root.accessor("invocation", { get: () => void 0 });
}
function Remote(methodExportOrOptions, context) {
	if (typeof methodExportOrOptions === "string") {
		validateName$1("Remote export name", methodExportOrOptions);
		return remoteDecorator({ kind: "direct" }, { exportName: methodExportOrOptions });
	}
	if (typeof methodExportOrOptions === "object") return remoteDecorator({ kind: "direct" }, markerOptions(methodExportOrOptions, REMOTE_OPTION_KEYS, "Remote options require name, mode: \"stream\", or resources"));
	if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
	addMarkerInitializer(context, { kind: "direct" });
}
const REMOTE_OPTION_KEYS = new Set([
	"name",
	"mode",
	"resources"
]);
/** Validate one decorator options object against its accepted keys and select the marker fields. */
function markerOptions(options, accepted, requirement) {
	const keys = Reflect.ownKeys(options);
	if (keys.length === 0 || keys.some((key) => typeof key !== "string" || !accepted.has(key)) || Object.hasOwn(options, "mode") && options.mode !== "stream") throw new TypeError(`typert-protocol: ${requirement}`);
	const { mode, name, resources } = options;
	if (name !== void 0) validateName$1("Remote export name", name);
	return {
		...mode === void 0 ? {} : { mode },
		...name === void 0 ? {} : { exportName: name },
		...resources === void 0 ? {} : { resources: resourceReaders(resources) }
	};
}
/** Freeze declared readers into the marker record; a misdeclared reader fails at decoration. */
function resourceReaders(resources) {
	const readers = {};
	for (const [kind, reader] of Object.entries(resources)) {
		if (typeof reader !== "function") throw new TypeError(`typert-protocol: Remote resource reader "${kind}" must be a function`);
		readers[kind] = reader;
	}
	if (Object.keys(readers).length === 0) throw new TypeError("typert-protocol: Remote resources require at least one reader");
	return Object.freeze(readers);
}
function remoteDecorator(invocation, options = {}) {
	return function(_method, context) {
		addMarkerInitializer(context, invocation, options);
	};
}
function readRemoteMethodDescriptor(prototype) {
	const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
	if (property === void 0) return void 0;
	const descriptor = property.value;
	if (descriptor === null || typeof descriptor !== "object") throw new TypeError("typert-protocol: Remote method descriptor must be an object");
	const version = Reflect.get(descriptor, "version");
	if (version !== 1) throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version)}`);
	const methods = Reflect.get(descriptor, "methods");
	if (!Array.isArray(methods)) throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
	return descriptor;
}
function addMarkerInitializer(context, invocation, options = {}) {
	if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
	const method = context.name;
	context.addInitializer(function() {
		const prototype = Object.getPrototypeOf(this);
		if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
		mark(prototype, method, invocation, options);
	});
}
function mark(prototype, method, invocation, { mode, exportName, resources }) {
	const descriptor = readRemoteMethodDescriptor(prototype);
	const marker = Object.freeze({
		method,
		...exportName === void 0 || exportName === method ? {} : { exportName },
		...mode === void 0 ? {} : { mode },
		invocation: Object.freeze(invocation),
		...resources === void 0 ? {} : { resources }
	});
	const current = descriptor?.methods.find((candidate) => candidate.method === method);
	if (current !== void 0) {
		if (current.exportName === marker.exportName && current.mode === marker.mode && current.resources === marker.resources && sameInvocation(current.invocation, invocation)) return;
		throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
	}
	Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
		configurable: true,
		value: Object.freeze({
			version: 1,
			methods: Object.freeze([...descriptor?.methods ?? [], marker])
		})
	});
}
function sameInvocation(left, right) {
	if (left.kind === "direct") return right.kind === "direct";
	if (right.kind === "direct") return false;
	return left.context === right.context;
}
function validateName$1(subject, value) {
	if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}
//#endregion
//#region ../../../vendor/cosmokit/lib/index.js
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
/** Shared config references used by schema validators and plugin runtimes. */
const write = Symbol.for("cosmokit.volatile.write");
function snapshot(value, ancestors = /* @__PURE__ */ new Set()) {
	if (typeof value === "function") throw new TypeError("volatile config cannot contain functions");
	if (value === null || typeof value !== "object") return value;
	if (ancestors.has(value)) throw new TypeError("volatile config cannot contain cycles");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) return Object.freeze(value.map((item) => snapshot(item, ancestors)));
		if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("volatile config objects must be plain objects or arrays");
		return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)])));
	} finally {
		ancestors.delete(value);
	}
}
/**
* Create a detached reference containing an immutable copy of the supplied data.
* @param value - validated config data; class instances and functions are unsupported.
* @returns a reference whose value is updated only by its owning runtime.
*/
function createVolatile(value) {
	let current = snapshot(value);
	return Object.freeze({
		get: () => current,
		[write]: (value) => {
			current = value;
		}
	});
}
/**
* Identify references across ESM/CJS copies of the shared library.
* @param value - a parsed config value.
* @returns whether the value implements the shared reference protocol.
*/
function isVolatile(value) {
	return typeof value === "object" && value !== null && write in value;
}
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
/** Binary source detection and base64/hex conversion helpers. */
var Binary;
(function(Binary) {
	Binary.is = isArrayBufferLike;
	Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/**
* Compare values recursively, treating two volatile references as equal regardless of value.
* Strict comparison distinguishes null/undefined, treats opaque objects by identity,
* compares URLs by normalized href, treats array holes as undefined, and considers distinct cyclic structures unequal.
* @param a - first value.
* @param b - second value.
* @param strict - whether to require strict data equality outside volatile references.
* @returns whether the values compare equal.
*/
function deepEqual(a, b, strict) {
	const ancestors = /* @__PURE__ */ new Set();
	function compare(a, b) {
		if (a === b) return true;
		if (isVolatile(a) || isVolatile(b)) return isVolatile(a) && isVolatile(b);
		if (!strict && isNullable(a) && isNullable(b)) return true;
		if (typeof a !== typeof b || typeof a !== "object" || !a || !b) return false;
		if (ancestors.has(a)) return false;
		function check(test, then) {
			return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
		}
		ancestors.add(a);
		try {
			return check(Array.isArray, (a, b) => {
				if (a.length !== b.length) return false;
				for (let index = 0; index < a.length; index++) if (!compare(a[index], b[index])) return false;
				return true;
			}) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("URL"), (a, b) => a.href === b.href) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
				if (a.byteLength !== b.byteLength) return false;
				const viewA = new Uint8Array(a);
				const viewB = new Uint8Array(b);
				for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
				return true;
			}) ?? ((!strict || [a, b].every((value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) && Object.keys({
				...a,
				...b
			}).every((key) => compare(a[key], b[key])));
		} finally {
			ancestors.delete(a);
		}
	}
	return compare(a, b);
}
/** Time constants plus parsing and formatting helpers. */
var Time;
(function(Time) {
	Time.millisecond = 1;
	Time.second = 1e3;
	Time.minute = Time.second * 60;
	Time.hour = Time.minute * 60;
	Time.day = Time.hour * 24;
	Time.week = Time.day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
	}
	Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * Time.day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * Time.minute);
	}
	Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
	}
	Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
		else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
		else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
		else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
		return ms + "ms";
	}
	Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../vendor/schemastery/lib/index.mjs
const kSchema = Symbol.for("schemastery");
const kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError$1 = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError];
	}
};
Object.defineProperty(ValidationError$1.prototype, kValidationError, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError$1.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError$1;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (isVolatile(value)) value = value.get();
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.volatile = function volatile() {
	if (this.meta.volatile) throw new TypeError("volatile schema is already wrapped");
	return this.extra("volatile", true);
};
const resolvers = {};
const checkedVolatile = Symbol("checked-volatile-schema");
function validateVolatileSchema(schema, path = [], blocked = false, seen = /* @__PURE__ */ new Map()) {
	const states = seen.get(schema) ?? /* @__PURE__ */ new Set();
	if (states.has(blocked)) return;
	states.add(blocked);
	seen.set(schema, states);
	if (schema.meta?.volatile && blocked) throw new ValidationError$1("volatile fields require a fixed object path without an enclosing volatile field", { path });
	const nested = blocked || !!schema.meta?.volatile;
	if (schema.dict) for (const [key, child] of Object.entries(schema.dict)) validateVolatileSchema(child, [...path, key], nested, seen);
	if (schema.sKey) validateVolatileSchema(schema.sKey, [...path, "<key>"], true, seen);
	if (schema.inner && (schema.type !== "lazy" || schema.inner[kSchema])) validateVolatileSchema(schema.inner, [...path, "*"], true, seen);
	if (schema.list) for (let index = 0; index < schema.list.length; index++) validateVolatileSchema(schema.list[index], [...path, String(index)], true, seen);
}
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (!options[checkedVolatile]) {
		validateVolatileSchema(schema, options.path);
		options = {
			...options,
			[checkedVolatile]: true
		};
	}
	if (schema.meta?.volatile) {
		const inner = Schema(schema);
		inner.meta = {
			...schema.meta,
			volatile: false
		};
		const [value, adapted] = Schema.resolve(data, inner, options, strict);
		try {
			return [createVolatile(value), adapted];
		} catch (error) {
			throw new ValidationError$1(error instanceof Error ? error.message : String(error), options);
		}
	}
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError$1(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError$1(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError$1(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError$1(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError$1(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError$1(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
		validateVolatileSchema(schema.inner, options.path, true);
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError$1(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError$1(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError$1(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError$1(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError$1(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError$1(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError$1(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError$1(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError$1(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError$1(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError$1(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError$1(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError$1(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError$1(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError$1(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.volatile ? createVolatile(schema.meta.default) : schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError$1(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError$1(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError$1(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError$1(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError$1(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region lib/types/config.js
/** Downloader mount settings shared by the plugin entry and the Remote service. */
/** Parse mount settings and supply defaults for omitted fields. */
const Config = Schema.object({
	endpoint: Schema.string().default("http://10.0.0.7:8082/jsonrpc"),
	tokenRef: Schema.string().default("ARIA2_TOKEN"),
	timeoutMs: Schema.number().min(1).default(15e3),
	storePath: Schema.string().default("downloader/submissions.json"),
	feedUrl: Schema.string().default("https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2")
});
//#endregion
//#region lib/types/aria2.js
/** Base failure type for aria2 calls, including authentication, deadline, and protocol failures. */
var Aria2Error = class extends Error {};
/** JSON-RPC error code 1 returned by aria2; the message identifies the method with the token removed. */
var Aria2AuthError = class extends Aria2Error {};
/** The call deadline expired; cancellation does not establish whether aria2 accepted the operation. */
var Aria2TimeoutError = class extends Aria2Error {};
/** Transport, HTTP, or response-validation failure with token-redacted response diagnostics. */
var Aria2ProtocolError = class extends Aria2Error {
	/** HTTP status, or zero when no response was received. */
	status;
	/** Response text with the configured token removed, truncated to 200 UTF-8 bytes before decoding. */
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
/**
* Create a client. `transport` defaults to a thin wrapper over global fetch.
* @param config - Endpoint, authentication token, and deadline covering transport and response parsing.
* @param transport - Sends each JSON-RPC request, using its signal for cancellation.
* @returns A client that validates responses and reports authentication, timeout, or protocol failures.
*/
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
/**
* Normalize a hexadecimal or base32 BitTorrent info hash.
* @param raw - A 40-digit hexadecimal or 32-character base32 hash, without surrounding whitespace.
* @returns The lowercase hexadecimal hash, or null for absent or invalid input.
*/
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
/**
* Retain the first candidate for each deduplication key without mutating the input.
* @param list - Candidates in preferred retention order.
* @returns A new array retaining original candidate objects and their relative order.
*/
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
/**
* Create a coordinator over the downloader and submission store.
* @param deps - Downloader and accepted-submission store; failures propagate to callers.
* @returns A coordinator that records successful submissions and prevents duplicate in-flight work within this instance.
*/
function createDownloadCoordinator(deps) {
	const { downloader, store } = deps;
	const inFlight = /* @__PURE__ */ new Map();
	async function run(candidate, resubmit) {
		if (!candidate.submittable) return { unsubmittable: true };
		const key = candidate.dedupeKey;
		if (!resubmit && store.has(key)) {
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
	return {
		submit: (candidate) => run(candidate, false),
		resubmit: (candidate) => run(candidate, true)
	};
}
//#endregion
//#region lib/types/service.js
/** The requested identifier is absent from the candidate set available to the service. */
var UnknownCandidateError = class extends Error {
	/** Requested identifier that could not be resolved for submission. */
	candidateId;
	constructor(candidateId) {
		super(`Unknown candidate: ${candidateId}`);
		this.name = "UnknownCandidateError";
		this.candidateId = candidateId;
	}
};
/**
* Create the service over the three injected seams.
* @param deps - Discovery, optional keyword-scoped discovery, downloader, and submission storage providers.
* @returns A service with a private candidate cache; unknown submission identifiers reject with UnknownCandidateError.
*/
function createDownloadService(deps) {
	const coordinator = createDownloadCoordinator(deps);
	let source = deps.source;
	let cache;
	async function discover() {
		cache = dedupeCandidates(await source.listCandidates());
		return cache;
	}
	return {
		async preferences() {
			return deps.preferences.value;
		},
		recordSearch: (keyword) => deps.preferences.addSearch(keyword),
		toggleFavorite: (keyword) => deps.preferences.toggleFavorite(keyword),
		deleteSearch: (keyword) => deps.preferences.deleteSearch(keyword),
		clearHistory: () => deps.preferences.clearHistory(),
		async search(keyword) {
			keyword = keyword.trim();
			if (!keyword) return [];
			source = deps.makeSource ? deps.makeSource(keyword) : deps.source;
			return discover();
		},
		async listCandidates() {
			return cache ?? discover();
		},
		async add(candidateId) {
			const candidate = (!cache || cache.length === 0 ? await discover() : cache).find((candidate) => candidate.id === candidateId);
			if (!candidate) throw new UnknownCandidateError(candidateId);
			return coordinator.submit(candidate);
		},
		submissions() {
			return deps.store.list();
		},
		async resubmit(candidateId) {
			const candidate = cache?.find((candidate) => candidate.id === candidateId) ?? (await discover()).find((candidate) => candidate.id === candidateId);
			if (!candidate) throw new UnknownCandidateError(candidateId);
			return coordinator.resubmit(candidate);
		},
		status(gid) {
			return deps.downloader.status(gid);
		},
		async refresh() {
			const candidates = await discover();
			return {
				candidates,
				discovered: candidates.length,
				known: candidates.filter((candidate) => deps.store.has(candidate.dedupeKey)).length,
				unsubmittable: candidates.filter((candidate) => !candidate.submittable).length
			};
		}
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/util.js
const regexName = /* @__PURE__ */ new RegExp("^[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
function getAllMatches(string, regex) {
	const matches = [];
	let match = regex.exec(string);
	while (match) {
		const allmatches = [];
		allmatches.startIndex = regex.lastIndex - match[0].length;
		const len = match.length;
		for (let index = 0; index < len; index++) allmatches.push(match[index]);
		matches.push(allmatches);
		match = regex.exec(string);
	}
	return matches;
}
const isName = function(string) {
	const match = regexName.exec(string);
	return !(match === null || typeof match === "undefined");
};
function isExist(v) {
	return typeof v !== "undefined";
}
/**
* Dangerous property names that could lead to prototype pollution or security issues
*/
const DANGEROUS_PROPERTY_NAMES = [
	"hasOwnProperty",
	"toString",
	"valueOf",
	"__defineGetter__",
	"__defineSetter__",
	"__lookupGetter__",
	"__lookupSetter__"
];
const criticalProperties = [
	"__proto__",
	"constructor",
	"prototype"
];
//#endregion
//#region ../../../node_modules/.pnpm/@nodable+entities@3.0.0/node_modules/@nodable/entities/src/entities.js
/**
* Currency Symbols
* @type {Record<string, string>}
*/
const CURRENCY = {
	cent: "¢",
	pound: "£",
	curren: "¤",
	yen: "¥",
	euro: "€",
	dollar: "$",
	fnof: "ƒ",
	inr: "₹",
	af: "؋",
	birr: "ብር",
	peso: "₱",
	rub: "₽",
	won: "₩",
	yuan: "¥",
	cedil: "¸"
};
const XML = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: "\""
};
const COMMON_HTML = {
	nbsp: "\xA0",
	copy: "©",
	reg: "®",
	trade: "™",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	laquo: "«",
	raquo: "»",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	bull: "•",
	para: "¶",
	sect: "§",
	deg: "°",
	frac12: "½",
	frac14: "¼",
	frac34: "¾"
};
//#endregion
//#region ../../../node_modules/.pnpm/@nodable+entities@3.0.0/node_modules/@nodable/entities/src/EntityDecoder.js
/**
* Action constants for `onExternalEntity` and `onInputEntity` hooks.
*
* Use these instead of raw strings to avoid typos:
*
* @example
* import EntityDecoder, { ENTITY_ACTION } from './EntityDecoder.js';
* const dec = new EntityDecoder({
*   onInputEntity: (name, value) => ENTITY_ACTION.BLOCK,
* });
*/
const ENTITY_ACTION = Object.freeze({
	/** Resolve and expand the entity normally. */
	ALLOW: "allow",
	/** Silently skip this entity — it will not be registered. */
	BLOCK: "block",
	/** Throw an error, aborting entity registration entirely. */
	THROW: "throw"
});
const SPECIAL_CHARS = /* @__PURE__ */ new Set("!?\\\\/[]$%{}^&*()<>|+");
/**
* Validate that an entity name contains no dangerous characters.
* @param {string} name
* @returns {string} the name, unchanged
* @throws {Error} on invalid characters
*/
function validateEntityName$1(name) {
	if (name[0] === "#") throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
	for (const ch of name) if (SPECIAL_CHARS.has(ch)) throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
	return name;
}
/**
* Merge one or more entity maps into a flat name→string map.
* Accepts either:
*   - plain string values:             { amp: '&' }
*   - legacy {regex,val} / {regx,val}: { lt: { regex: /.../, val: '<' } }
*
* Values containing '&' are skipped (recursive expansion risk).
*
* @param {...object} maps
* @returns {Record<string, string>}
*/
function mergeEntityMaps(...maps) {
	const out = Object.create(null);
	for (const map of maps) {
		if (!map) continue;
		for (const key of Object.keys(map)) {
			const raw = map[key];
			if (typeof raw === "string") out[key] = raw;
			else if (raw && typeof raw === "object" && raw.val !== void 0) {
				const val = raw.val;
				if (typeof val === "string") out[key] = val;
			}
		}
	}
	return out;
}
const LIMIT_TIER_EXTERNAL = "external";
const LIMIT_TIER_BASE = "base";
const LIMIT_TIER_ALL = "all";
/**
* Resolve `applyLimitsTo` option into a normalised Set of tier strings.
* Accepted values: 'external' | 'base' | 'all' | string[]
* Default: 'external' (only untrusted injected entities are counted).
* @param {string|string[]|undefined} raw
* @returns {Set<string>}
*/
function parseLimitTiers(raw) {
	if (!raw || raw === LIMIT_TIER_EXTERNAL) return new Set([LIMIT_TIER_EXTERNAL]);
	if (raw === LIMIT_TIER_ALL) return new Set([LIMIT_TIER_ALL]);
	if (raw === LIMIT_TIER_BASE) return new Set([LIMIT_TIER_BASE]);
	if (Array.isArray(raw)) return new Set(raw);
	return new Set([LIMIT_TIER_EXTERNAL]);
}
const NCR_LEVEL = Object.freeze({
	allow: 0,
	leave: 1,
	remove: 2,
	throw: 3
});
const XML10_ALLOWED_C0 = new Set([
	9,
	10,
	13
]);
/**
* Parse the `ncr` constructor option into flat, hot-path-friendly fields.
* @param {object|undefined} ncr
* @returns {{ xmlVersion: number, onLevel: number, nullLevel: number }}
*/
function parseNCRConfig(ncr) {
	if (!ncr) return {
		xmlVersion: 1,
		onLevel: NCR_LEVEL.allow,
		nullLevel: NCR_LEVEL.remove
	};
	const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1;
	const onLevel = NCR_LEVEL[ncr.onNCR] ?? NCR_LEVEL.allow;
	const nullLevel = NCR_LEVEL[ncr.nullNCR] ?? NCR_LEVEL.remove;
	return {
		xmlVersion,
		onLevel,
		nullLevel: Math.max(nullLevel, NCR_LEVEL.remove)
	};
}
/**
* Single-pass, zero-regex entity replacer for XML/HTML content.
*
* Algorithm: scan the string once for '&', read to ';', resolve via map
* or direct codepoint conversion, build output chunks, join once at the end.
*
* Entity lookup priority (highest → lowest):
*   1. input / runtime  (DOCTYPE entities for current document)
*   2. persistent external (survive across documents)
*   3. base named map   (DEFAULT_XML_ENTITIES + user-supplied namedEntities)
*
* Both input and external resolve as the 'external' tier for limit purposes.
* Base map entities resolve as the 'base' tier.
*
* Numeric / hex references (&#NNN; / &#xHH;) are resolved directly via
* String.fromCodePoint() — no map needed. They count as 'base' tier.
*
* @example
* const replacer = new EntityReplacer({ namedEntities: COMMON_HTML });
* replacer.setExternalEntities({ brand: 'Acme' });
*
* const instance = replacer.reset();
* instance.addInputEntities({ version: '1.0' });
* instance.encode('&brand; v&version; &lt;'); // 'Acme v1.0 <'
*/
var EntityDecoder = class {
	/**
	* @param {object} [options]
	* @param {object|null}  [options.namedEntities]        — extra named entities merged into base map
	* @param {object}  [options.limit]                 — security limits
	* @param {number}       [options.limit.maxTotalExpansions=0]  — 0 = unlimited
	* @param {number}       [options.limit.maxExpandedLength=0]   — 0 = unlimited
	* @param {'external'|'base'|'all'|string[]} [options.limit.applyLimitsTo='external']
	*   Which entity tiers count against the security limits:
	*   - 'external' (default) — only input/runtime + persistent external entities
	*   - 'base'               — only DEFAULT_XML_ENTITIES + namedEntities
	*   - 'all'                — every entity regardless of tier
	*   - string[]             — explicit combination, e.g. ['external', 'base']
	* @param {((resolved: string, original: string) => string)|null} [options.postCheck=null]
	* @param {string[]} [options.remove=[]] — entity names (e.g. ['nbsp', '#13']) to delete (replace with empty string)
	* @param {string[]} [options.leave=[]]  — entity names to keep as literal (unchanged in output)
	* @param {object}   [options.ncr]       — Numeric Character Reference controls
	* @param {1.0|1.1}  [options.ncr.xmlVersion=1.0]
	*   XML version governing which codepoint ranges are restricted:
	*   - 1.0 — C0 controls U+0001–U+001F (except U+0009/000A/000D) are prohibited
	*   - 1.1 — C0 controls are allowed when written as NCRs; C1 (U+007F–U+009F) decoded as-is
	* @param {'allow'|'leave'|'remove'|'throw'} [options.ncr.onNCR='allow']
	*   Base action for numeric references. Severity order: allow < leave < remove < throw.
	*   For codepoint ranges that carry a minimum level (surrogates → remove, XML 1.0 C0 → remove),
	*   the effective action is max(onNCR, rangeMinimum).
	* @param {'remove'|'throw'} [options.ncr.nullNCR='remove']
	*   Action for U+0000 (null). 'allow' and 'leave' are clamped to 'remove' since null is never safe.
	* @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onExternalEntity=null]
	*   Hook called when an external entity is registered via `setExternalEntities()` or
	*   `addExternalEntity()`. Return `ENTITY_ACTION.ALLOW` to accept the entity,
	*   `ENTITY_ACTION.BLOCK` to silently skip it, or `ENTITY_ACTION.THROW` to abort with an error.
	* @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} [options.onInputEntity=null]
	*   Hook called when an input entity is registered via `addInputEntities()`. Return
	*   `ENTITY_ACTION.ALLOW` to accept, `ENTITY_ACTION.BLOCK` to silently skip, or
	*   `ENTITY_ACTION.THROW` to abort with an error.
	*/
	constructor(options = {}) {
		this._limit = options.limit || {};
		this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
		this._maxExpandedLength = this._limit.maxExpandedLength || 0;
		this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
		this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
		this._numericAllowed = options.numericAllowed ?? true;
		this._baseMap = mergeEntityMaps(XML, options.namedEntities || null);
		/** @type {Record<string, string>} */
		this._externalMap = Object.create(null);
		/** @type {Record<string, string>} */
		this._inputMap = Object.create(null);
		this._totalExpansions = 0;
		this._expandedLength = 0;
		/** @type {Set<string>} */
		this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
		/** @type {Set<string>} */
		this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
		const ncrCfg = parseNCRConfig(options.ncr);
		this._ncrXmlVersion = ncrCfg.xmlVersion;
		this._ncrOnLevel = ncrCfg.onLevel;
		this._ncrNullLevel = ncrCfg.nullLevel;
		/** @type {((name: string, value: string) => 'allow'|'block'|'throw')|null} */
		this._onExternalEntity = typeof options.onExternalEntity === "function" ? options.onExternalEntity : null;
		/** @type {((name: string, value: string) => 'allow'|'block'|'throw')|null} */
		this._onInputEntity = typeof options.onInputEntity === "function" ? options.onInputEntity : null;
	}
	/**
	* Invoke a registration hook for a single entity name/value pair.
	* Returns true when the entity should be accepted, false when it should be
	* silently skipped (BLOCK), and throws when the hook returns THROW.
	*
	* @param {((name: string, value: string) => 'allow'|'block'|'throw')|null} hook
	* @param {string} name
	* @param {string} value
	* @param {string} context  — used in error messages ('external' | 'input')
	* @returns {boolean}  true = accept, false = skip
	*/
	_applyRegistrationHook(hook, name, value, context) {
		if (!hook) return true;
		const action = hook(name, value);
		if (action === ENTITY_ACTION.BLOCK) return false;
		if (action === ENTITY_ACTION.THROW) throw new Error(`[EntityDecoder] Registration of ${context} entity "&${name};" was rejected by hook`);
		return true;
	}
	/**
	* Replace the full set of persistent external entities.
	* All keys are validated — throws on invalid characters.
	* If `onExternalEntity` is set, it is called once per entry; entries that
	* return `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW`
	* aborts the whole call.
	* @param {Record<string, string | { regex?: RegExp, val: string }>} map
	*/
	setExternalEntities(map) {
		if (map) for (const key of Object.keys(map)) validateEntityName$1(key);
		if (!this._onExternalEntity) {
			this._externalMap = mergeEntityMaps(map);
			return;
		}
		const flat = mergeEntityMaps(map);
		const filtered = Object.create(null);
		for (const [name, value] of Object.entries(flat)) if (this._applyRegistrationHook(this._onExternalEntity, name, value, "external")) filtered[name] = value;
		this._externalMap = filtered;
	}
	/**
	* Add a single persistent external entity.
	* If `onExternalEntity` is set it is called before the entity is stored;
	* `ENTITY_ACTION.BLOCK` silently skips storage, `ENTITY_ACTION.THROW` raises.
	* @param {string} key
	* @param {string} value
	*/
	addExternalEntity(key, value) {
		validateEntityName$1(key);
		if (typeof value === "string" && value.indexOf("&") === -1) {
			if (this._applyRegistrationHook(this._onExternalEntity, key, value, "external")) this._externalMap[key] = value;
		}
	}
	/**
	* Inject DOCTYPE entities for the current document.
	* Also resets per-document expansion counters.
	* If `onInputEntity` is set it is called once per entry; entries returning
	* `ENTITY_ACTION.BLOCK` are silently omitted, `ENTITY_ACTION.THROW` aborts.
	* @param {Record<string, string | { regx?: RegExp, regex?: RegExp, val: string }>} map
	*/
	addInputEntities(map) {
		this._totalExpansions = 0;
		this._expandedLength = 0;
		if (!this._onInputEntity) {
			this._inputMap = mergeEntityMaps(map);
			return;
		}
		const flat = mergeEntityMaps(map);
		const filtered = Object.create(null);
		for (const [name, value] of Object.entries(flat)) if (this._applyRegistrationHook(this._onInputEntity, name, value, "input")) filtered[name] = value;
		this._inputMap = filtered;
	}
	/**
	* Wipe input/runtime entities and reset counters.
	* Call this before processing each new document.
	* @returns {this}
	*/
	reset() {
		this._inputMap = Object.create(null);
		this._totalExpansions = 0;
		this._expandedLength = 0;
		return this;
	}
	/**
	* Update the XML version used for NCR classification.
	* Call this as soon as the document's `<?xml version="...">` declaration is parsed.
	* @param {1.0|1.1|number} version
	*/
	setXmlVersion(version) {
		this._ncrXmlVersion = version === 1.1 ? 1.1 : 1;
	}
	/**
	* Replace all entity references in `str` in a single pass.
	*
	* @param {string} str
	* @returns {string}
	*/
	decode(str) {
		if (typeof str !== "string" || str.length === 0) return str;
		if (str.indexOf("&") === -1) return str;
		const original = str;
		const chunks = [];
		const len = str.length;
		let last = 0;
		let i = 0;
		const limitExpansions = this._maxTotalExpansions > 0;
		const limitLength = this._maxExpandedLength > 0;
		const checkLimits = limitExpansions || limitLength;
		while (i < len) {
			if (str.charCodeAt(i) !== 38) {
				i++;
				continue;
			}
			let j = i + 1;
			while (j < len && str.charCodeAt(j) !== 59 && j - i <= 32) j++;
			if (j >= len || str.charCodeAt(j) !== 59) {
				i++;
				continue;
			}
			const token = str.slice(i + 1, j);
			if (token.length === 0) {
				i++;
				continue;
			}
			let replacement;
			let tier;
			if (this._removeSet.has(token)) {
				replacement = "";
				if (tier === void 0) tier = LIMIT_TIER_EXTERNAL;
			} else if (this._leaveSet.has(token)) {
				i++;
				continue;
			} else if (token.charCodeAt(0) === 35) {
				const ncrResult = this._resolveNCR(token);
				if (ncrResult === void 0) {
					i++;
					continue;
				}
				replacement = ncrResult;
				tier = LIMIT_TIER_BASE;
			} else {
				const resolved = this._resolveName(token);
				replacement = resolved?.value;
				tier = resolved?.tier;
			}
			if (replacement === void 0) {
				i++;
				continue;
			}
			if (i > last) chunks.push(str.slice(last, i));
			chunks.push(replacement);
			last = j + 1;
			i = last;
			if (checkLimits && this._tierCounts(tier)) {
				if (limitExpansions) {
					this._totalExpansions++;
					if (this._totalExpansions > this._maxTotalExpansions) throw new Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`);
				}
				if (limitLength) {
					const delta = replacement.length - (token.length + 2);
					if (delta > 0) {
						this._expandedLength += delta;
						if (this._expandedLength > this._maxExpandedLength) throw new Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`);
					}
				}
			}
		}
		if (last < len) chunks.push(str.slice(last));
		const result = chunks.length === 0 ? str : chunks.join("");
		return this._postCheck(result, original);
	}
	/**
	* Returns true if a resolved entity of the given tier should count
	* against the expansion/length limits.
	* @param {string} tier  — LIMIT_TIER_EXTERNAL | LIMIT_TIER_BASE
	* @returns {boolean}
	*/
	_tierCounts(tier) {
		if (this._limitTiers.has(LIMIT_TIER_ALL)) return true;
		return this._limitTiers.has(tier);
	}
	/**
	* Resolve a named entity token (without & and ;).
	* Priority: inputMap > externalMap > baseMap
	* Returns the resolved value tagged with its limit tier.
	*
	* @param {string} name
	* @returns {{ value: string, tier: string }|undefined}
	*/
	_resolveName(name) {
		if (name in this._inputMap) return {
			value: this._inputMap[name],
			tier: LIMIT_TIER_EXTERNAL
		};
		if (name in this._externalMap) return {
			value: this._externalMap[name],
			tier: LIMIT_TIER_EXTERNAL
		};
		if (name in this._baseMap) return {
			value: this._baseMap[name],
			tier: LIMIT_TIER_BASE
		};
	}
	/**
	* Classify a codepoint and return the minimum action level that must be applied.
	* Returns -1 when no minimum is imposed (normal allow path).
	*
	* Ranges checked (in priority order):
	*   1. U+0000            — null, governed by nullNCR (always ≥ remove)
	*   2. U+D800–U+DFFF     — surrogates, always prohibited (min: remove)
	*   3. U+0001–U+001F \ {0x09,0x0A,0x0D}  — XML 1.0 restricted C0 (min: remove)
	*      (skipped in XML 1.1 — C0 controls are allowed when written as NCRs)
	*
	* @param {number} cp  — codepoint
	* @returns {number}   — minimum NCR_LEVEL value, or -1 for no restriction
	*/
	_classifyNCR(cp) {
		if (cp === 0) return this._ncrNullLevel;
		if (cp >= 55296 && cp <= 57343) return NCR_LEVEL.remove;
		if (this._ncrXmlVersion === 1) {
			if (cp >= 1 && cp <= 31 && !XML10_ALLOWED_C0.has(cp)) return NCR_LEVEL.remove;
		}
		return -1;
	}
	/**
	* Execute a resolved NCR action.
	*
	* @param {number} action   — NCR_LEVEL value
	* @param {string} token    — raw token (e.g. '#38') for error messages
	* @param {number} cp       — codepoint, used only for error messages
	* @returns {string|undefined}
	*   - decoded character string  → 'allow'
	*   - ''                        → 'remove'
	*   - undefined                 → 'leave' (caller must skip past '&' only)
	*   - throws Error              → 'throw'
	*/
	_applyNCRAction(action, token, cp) {
		switch (action) {
			case NCR_LEVEL.allow: return String.fromCodePoint(cp);
			case NCR_LEVEL.remove: return "";
			case NCR_LEVEL.leave: return;
			case NCR_LEVEL.throw: throw new Error(`[EntityDecoder] Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`);
			default: return String.fromCodePoint(cp);
		}
	}
	/**
	* Full NCR resolution pipeline for a numeric token.
	*
	* Steps:
	*   1. Parse the codepoint (decimal or hex).
	*   2. Validate the raw codepoint range (NaN, <0, >0x10FFFF).
	*   3. If numericAllowed is false and no minimum restriction applies → leave as-is.
	*   4. Classify the codepoint to find the minimum required action level.
	*   5. Resolve effective action = max(onNCR, minimum).
	*   6. Apply and return.
	*
	* @param {string} token  — e.g. '#38', '#x26', '#X26'
	* @returns {string|undefined}
	*   - string (incl. '')  — replacement ('' = remove)
	*   - undefined          — leave original &token; as-is
	*/
	_resolveNCR(token) {
		const second = token.charCodeAt(1);
		let cp;
		if (second === 120 || second === 88) cp = parseInt(token.slice(2), 16);
		else cp = parseInt(token.slice(1), 10);
		if (Number.isNaN(cp) || cp < 0 || cp > 1114111) return void 0;
		const minimum = this._classifyNCR(cp);
		if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return void 0;
		const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
		return this._applyNCRAction(effective, token, cp);
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
const defaultOnDangerousProperty = (name) => {
	if (DANGEROUS_PROPERTY_NAMES.includes(name)) return "__" + name;
	return name;
};
const defaultOptions$3 = {
	preserveOrder: false,
	attributeNamePrefix: "@_",
	attributesGroupName: false,
	textNodeName: "#text",
	ignoreAttributes: true,
	removeNSPrefix: false,
	allowBooleanAttributes: false,
	parseTagValue: true,
	parseAttributeValue: false,
	trimValues: true,
	cdataPropName: false,
	numberParseOptions: {
		hex: true,
		leadingZeros: true,
		eNotation: true,
		unicode: false
	},
	tagValueProcessor: function(tagName, val) {
		return val;
	},
	attributeValueProcessor: function(attrName, val) {
		return val;
	},
	stopNodes: [],
	alwaysCreateTextNode: false,
	isArray: () => false,
	commentPropName: false,
	unpairedTags: [],
	processEntities: true,
	htmlEntities: false,
	entityDecoder: null,
	ignoreDeclaration: false,
	ignorePiTags: false,
	transformTagName: false,
	transformAttributeName: false,
	updateTag: function(tagName, jPath, attrs) {
		return tagName;
	},
	captureMetaData: false,
	maxNestedTags: 100,
	strictReservedNames: true,
	jPath: true,
	onDangerousProperty: defaultOnDangerousProperty
};
/**
* Validates that a property name is safe to use
* @param {string} propertyName - The property name to validate
* @param {string} optionName - The option field name (for error message)
* @throws {Error} If property name is dangerous
*/
function validatePropertyName(propertyName, optionName) {
	if (typeof propertyName !== "string") return;
	const normalized = propertyName.toLowerCase();
	if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) throw new Error(`[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`);
	if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) throw new Error(`[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`);
}
/**
* Normalizes processEntities option for backward compatibility
* @param {boolean|object} value 
* @returns {object} Always returns normalized object
*/
function normalizeProcessEntities(value, htmlEntities) {
	if (typeof value === "boolean") return {
		enabled: value,
		maxEntitySize: 1e4,
		maxExpansionDepth: 1e4,
		maxTotalExpansions: Infinity,
		maxExpandedLength: 1e5,
		maxEntityCount: 1e3,
		allowedTags: null,
		tagFilter: null,
		appliesTo: "all"
	};
	if (typeof value === "object" && value !== null) return {
		enabled: value.enabled !== false,
		maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
		maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
		maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
		maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
		maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
		allowedTags: value.allowedTags ?? null,
		tagFilter: value.tagFilter ?? null,
		appliesTo: value.appliesTo ?? "all"
	};
	return normalizeProcessEntities(true);
}
const buildOptions = function(options) {
	const built = Object.assign({}, defaultOptions$3, options);
	const propertyNameOptions = [
		{
			value: built.attributeNamePrefix,
			name: "attributeNamePrefix"
		},
		{
			value: built.attributesGroupName,
			name: "attributesGroupName"
		},
		{
			value: built.textNodeName,
			name: "textNodeName"
		},
		{
			value: built.cdataPropName,
			name: "cdataPropName"
		},
		{
			value: built.commentPropName,
			name: "commentPropName"
		}
	];
	for (const { value, name } of propertyNameOptions) if (value) validatePropertyName(value, name);
	if (built.onDangerousProperty === null) built.onDangerousProperty = defaultOnDangerousProperty;
	built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);
	built.unpairedTagsSet = new Set(built.unpairedTags);
	if (built.stopNodes && Array.isArray(built.stopNodes)) built.stopNodes = built.stopNodes.map((node) => {
		if (typeof node === "string" && node.startsWith("*.")) return ".." + node.substring(2);
		return node;
	});
	return built;
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
let METADATA_SYMBOL$1;
if (typeof Symbol !== "function") METADATA_SYMBOL$1 = "@@xmlMetadata";
else METADATA_SYMBOL$1 = Symbol("XML Node Metadata");
var XmlNode = class {
	constructor(tagname) {
		this.tagname = tagname;
		this.child = [];
		this[":@"] = Object.create(null);
	}
	add(key, val) {
		if (key === "__proto__") key = "#__proto__";
		this.child.push({ [key]: val });
	}
	addChild(node, startIndex) {
		if (node.tagname === "__proto__") node.tagname = "#__proto__";
		if (node[":@"] && Object.keys(node[":@"]).length > 0) this.child.push({
			[node.tagname]: node.child,
			[":@"]: node[":@"]
		});
		else this.child.push({ [node.tagname]: node.child });
		this.addStartIndex(startIndex);
	}
	addStartIndex(startIndex) {
		if (startIndex !== void 0) this.child[this.child.length - 1][METADATA_SYMBOL$1] = { startIndex };
	}
	addEndIndex(endIndex) {
		const lastChild = this.child[this.child.length - 1];
		if (lastChild !== void 0 && lastChild[METADATA_SYMBOL$1] !== void 0 && lastChild[METADATA_SYMBOL$1].endIndex === void 0) lastChild[METADATA_SYMBOL$1].endIndex = endIndex;
	}
	/** symbol used for metadata */
	static getMetaDataSymbol() {
		return METADATA_SYMBOL$1;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/xml-naming@0.3.0/node_modules/xml-naming/src/index.js
/**
* xml-naming
* Validates XML Name productions as defined in the XML 1.0 and 1.1 specifications.
* Covers: Name, NCName, QName, NMToken, NMTokens
*
* XML 1.0 spec: https://www.w3.org/TR/xml/#NT-Name
* XML 1.1 spec: https://www.w3.org/TR/xml11/#NT-NameStartChar
* XML NS spec:  https://www.w3.org/TR/xml-names/#NT-NCName
*/
const nameStartChar10 = ":A-Za-z_À-ÖØ-öø-˿Ͱ-ͽͿ-҆҈-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�";
const nameChar10 = ":A-Za-z_À-ÖØ-öø-˿Ͱ-ͽͿ-҆҈-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�\\-\\.\\d·̀-ͯ‿-⁀";
const nameStartChar11 = ":A-Za-z_À-˿Ͱ-ͽͿ-҆҈-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
const nameChar11 = ":A-Za-z_À-˿Ͱ-ͽͿ-҆҈-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿\\-\\.\\d·̀-ͯ҇‿-⁀";
const buildRegexes = (startChar, char, flags = "") => {
	const ncNamePat = `[${startChar.replace(":", "")}][${char.replace(":", "")}]*`;
	return {
		name: new RegExp(`^[${startChar}][${char}]*$`, flags),
		ncName: new RegExp(`^${ncNamePat}$`, flags),
		qName: new RegExp(`^${ncNamePat}(?::${ncNamePat})?$`, flags),
		nmToken: new RegExp(`^[${char}]+$`, flags),
		nmTokens: new RegExp(`^[${char}]+(?:\\s+[${char}]+)*$`, flags)
	};
};
const regexes10 = buildRegexes(nameStartChar10, nameChar10);
const regexes11 = buildRegexes(nameStartChar11, nameChar11, "u");
const regexesAscii = buildRegexes(":A-Za-z_", ":A-Za-z_\\-\\.\\d");
const getRegexes = (xmlVersion = "1.0", asciiOnly = false) => {
	if (asciiOnly) return regexesAscii;
	return xmlVersion === "1.1" ? regexes11 : regexes10;
};
/**
* Returns true if the string is a valid XML Name.
* Colons are allowed anywhere (Name production).
* Used for: DOCTYPE entity names, notation names, DTD element declarations.
*
* @param {{ xmlVersion?: '1.0'|'1.1', asciiOnly?: boolean }} [opts]
*   asciiOnly: skip unicode-aware matching, ASCII names only (default false).
*/
const name$1 = (str, { xmlVersion = "1.0", asciiOnly = false } = {}) => getRegexes(xmlVersion, asciiOnly).name.test(str);
/**
* Returns true if the string is a valid QName (Qualified Name).
* Allows exactly one colon as a prefix separator: prefix:localName.
* Used for: element and attribute names in namespace-aware XML/SVG.
*
* @param {{ xmlVersion?: '1.0'|'1.1', asciiOnly?: boolean }} [opts]
*   asciiOnly: skip unicode-aware matching, ASCII names only (default false).
*/
const qName = (str, { xmlVersion = "1.0", asciiOnly = false } = {}) => getRegexes(xmlVersion, asciiOnly).qName.test(str);
const PRODUCTIONS = [
	"name",
	"ncName",
	"qName",
	"nmToken",
	"nmTokens"
];
/**
* Returns a memoized boolean validator function for a single production,
* with opts fixed at creation time.
*
* @param {'name'|'ncName'|'qName'|'nmToken'|'nmTokens'} production
* @param {{ xmlVersion?: '1.0'|'1.1', asciiOnly?: boolean, maxCacheSize?: number }} [opts]
*   maxCacheSize: max number of distinct strings to cache (default 2048).
*   Once reached, new strings are validated but not cached; existing cached
*   entries keep being served.
* @returns {((str: string) => boolean) & { reset: () => void }}
*/
const createValidator = (production, { xmlVersion = "1.0", asciiOnly = false, maxCacheSize = 2048 } = {}) => {
	if (!PRODUCTIONS.includes(production)) throw new TypeError(`Unknown production "${production}". Must be one of: ${PRODUCTIONS.join(", ")}`);
	const regex = getRegexes(xmlVersion, asciiOnly)[production];
	let cache = /* @__PURE__ */ new Map();
	const validator = (str) => {
		const cached = cache.get(str);
		if (cached !== void 0) return cached;
		const result = regex.test(str);
		if (cache.size < maxCacheSize) cache.set(str, result);
		return result;
	};
	validator.reset = () => {
		cache = /* @__PURE__ */ new Map();
	};
	return validator;
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
	constructor(options, xmlVersion) {
		this.suppressValidationErr = !options;
		this.options = options;
		this.xmlVersion = xmlVersion || 1;
	}
	setXmlVersion(xmlVersion = 1) {
		this.xmlVersion = xmlVersion;
	}
	readDocType(xmlData, i) {
		const entities = Object.create(null);
		let entityCount = 0;
		if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
			i = i + 9;
			let angleBracketsCount = 1;
			let hasBody = false, comment = false;
			let quoteChar = null;
			let exp = "";
			for (; i < xmlData.length; i++) {
				if (quoteChar !== null) {
					if (xmlData[i] === quoteChar) quoteChar = null;
					exp += xmlData[i];
					continue;
				}
				if (!hasBody && !comment && (xmlData[i] === "\"" || xmlData[i] === "'")) {
					quoteChar = xmlData[i];
					exp += xmlData[i];
					continue;
				}
				if (xmlData[i] === "<" && !comment) {
					if (hasBody && hasSeq$1(xmlData, "!ENTITY", i)) {
						i += 7;
						let entityName, val;
						[entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
						if (val.indexOf("&") === -1) {
							if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) throw new Error(`Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`);
							entities[entityName] = val;
							entityCount++;
						}
					} else if (hasBody && hasSeq$1(xmlData, "!ELEMENT", i)) {
						i += 8;
						const { index } = this.readElementExp(xmlData, i + 1);
						i = index;
					} else if (hasBody && hasSeq$1(xmlData, "!ATTLIST", i)) i += 8;
					else if (hasBody && hasSeq$1(xmlData, "!NOTATION", i)) {
						i += 9;
						const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
						i = index;
					} else if (hasSeq$1(xmlData, "!--", i)) comment = true;
					else throw new Error(`Invalid DOCTYPE`);
					angleBracketsCount++;
					exp = "";
				} else if (xmlData[i] === ">") {
					if (comment) {
						if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
							comment = false;
							angleBracketsCount--;
						}
					} else angleBracketsCount--;
					if (angleBracketsCount === 0) break;
				} else if (xmlData[i] === "[") hasBody = true;
				else exp += xmlData[i];
			}
			if (quoteChar !== null || angleBracketsCount !== 0) throw new Error(`Unclosed DOCTYPE`);
		} else throw new Error(`Invalid Tag instead of DOCTYPE`);
		return {
			entities,
			i
		};
	}
	readEntityExp(xmlData, i) {
		i = skipWhitespace$1(xmlData, i);
		const startIndex = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== "\"" && xmlData[i] !== "'") i++;
		let entityName = xmlData.substring(startIndex, i);
		validateEntityName(entityName, { xmlVersion: this.xmlVersion });
		i = skipWhitespace$1(xmlData, i);
		if (!this.suppressValidationErr) {
			if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") throw new Error("External entities are not supported");
			else if (xmlData[i] === "%") throw new Error("Parameter entities are not supported");
		}
		let entityValue = "";
		[i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
		if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) throw new Error(`Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);
		i--;
		return [
			entityName,
			entityValue,
			i
		];
	}
	readNotationExp(xmlData, i) {
		i = skipWhitespace$1(xmlData, i);
		const startIndex = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		let notationName = xmlData.substring(startIndex, i);
		!this.suppressValidationErr && validateEntityName(notationName, { xmlVersion: this.xmlVersion });
		i = skipWhitespace$1(xmlData, i);
		const identifierType = xmlData.substring(i, i + 6).toUpperCase();
		if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
		i += identifierType.length;
		i = skipWhitespace$1(xmlData, i);
		let publicIdentifier = null;
		let systemIdentifier = null;
		if (identifierType === "PUBLIC") {
			[i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
			i = skipWhitespace$1(xmlData, i);
			if (xmlData[i] === "\"" || xmlData[i] === "'") [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
		} else if (identifierType === "SYSTEM") {
			[i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
			if (!this.suppressValidationErr && !systemIdentifier) throw new Error("Missing mandatory system identifier for SYSTEM notation");
		}
		return {
			notationName,
			publicIdentifier,
			systemIdentifier,
			index: --i
		};
	}
	readIdentifierVal(xmlData, i, type) {
		let identifierVal = "";
		const startChar = xmlData[i];
		if (startChar !== "\"" && startChar !== "'") throw new Error(`Expected quoted string, found "${startChar}"`);
		i++;
		const startIndex = i;
		while (i < xmlData.length && xmlData[i] !== startChar) i++;
		identifierVal = xmlData.substring(startIndex, i);
		if (xmlData[i] !== startChar) throw new Error(`Unterminated ${type} value`);
		i++;
		return [i, identifierVal];
	}
	readElementExp(xmlData, i) {
		i = skipWhitespace$1(xmlData, i);
		const startIndex = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		let elementName = xmlData.substring(startIndex, i);
		if (!this.suppressValidationErr && !qName(elementName, { xmlVersion: this.xmlVersion })) throw new Error(`Invalid element name: "${elementName}"`);
		i = skipWhitespace$1(xmlData, i);
		let contentModel = "";
		if (xmlData[i] === "E" && hasSeq$1(xmlData, "MPTY", i)) i += 4;
		else if (xmlData[i] === "A" && hasSeq$1(xmlData, "NY", i)) i += 2;
		else if (xmlData[i] === "(") {
			i++;
			const startIndex = i;
			while (i < xmlData.length && xmlData[i] !== ")") i++;
			contentModel = xmlData.substring(startIndex, i);
			if (xmlData[i] !== ")") throw new Error("Unterminated content model");
		} else if (!this.suppressValidationErr) throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
		return {
			elementName,
			contentModel: contentModel.trim(),
			index: i
		};
	}
	readAttlistExp(xmlData, i) {
		i = skipWhitespace$1(xmlData, i);
		let startIndex = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		let elementName = xmlData.substring(startIndex, i);
		validateEntityName(elementName, { xmlVersion: this.xmlVersion });
		i = skipWhitespace$1(xmlData, i);
		startIndex = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		let attributeName = xmlData.substring(startIndex, i);
		if (!validateEntityName(attributeName, { xmlVersion: this.xmlVersion })) throw new Error(`Invalid attribute name: "${attributeName}"`);
		i = skipWhitespace$1(xmlData, i);
		let attributeType = "";
		if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
			attributeType = "NOTATION";
			i += 8;
			i = skipWhitespace$1(xmlData, i);
			if (xmlData[i] !== "(") throw new Error(`Expected '(', found "${xmlData[i]}"`);
			i++;
			let allowedNotations = [];
			while (i < xmlData.length && xmlData[i] !== ")") {
				const startIndex = i;
				while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") i++;
				let notation = xmlData.substring(startIndex, i);
				notation = notation.trim();
				if (!validateEntityName(notation, { xmlVersion: this.xmlVersion })) throw new Error(`Invalid notation name: "${notation}"`);
				allowedNotations.push(notation);
				if (xmlData[i] === "|") {
					i++;
					i = skipWhitespace$1(xmlData, i);
				}
			}
			if (xmlData[i] !== ")") throw new Error("Unterminated list of notations");
			i++;
			attributeType += " (" + allowedNotations.join("|") + ")";
		} else {
			const startIndex = i;
			while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
			attributeType += xmlData.substring(startIndex, i);
			if (!this.suppressValidationErr && ![
				"CDATA",
				"ID",
				"IDREF",
				"IDREFS",
				"ENTITY",
				"ENTITIES",
				"NMTOKEN",
				"NMTOKENS"
			].includes(attributeType.toUpperCase())) throw new Error(`Invalid attribute type: "${attributeType}"`);
		}
		i = skipWhitespace$1(xmlData, i);
		let defaultValue = "";
		if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
			defaultValue = "#REQUIRED";
			i += 8;
		} else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
			defaultValue = "#IMPLIED";
			i += 7;
		} else [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
		return {
			elementName,
			attributeName,
			attributeType,
			defaultValue,
			index: i
		};
	}
};
const skipWhitespace$1 = (data, index) => {
	while (index < data.length && /\s/.test(data[index])) index++;
	return index;
};
function hasSeq$1(data, seq, i) {
	for (let j = 0; j < seq.length; j++) if (seq[j] !== data[i + j + 1]) return false;
	return true;
}
function validateEntityName(name, xmlVersion) {
	if (qName(name, { xmlVersion })) return name;
	else throw new Error(`Invalid entity name ${name}`);
}
//#endregion
//#region ../../../node_modules/.pnpm/anynum@1.0.1/node_modules/anynum/digitTable.js
/**
* Flat lookup table: maps Unicode code point → ASCII digit (0-9).
* Only decimal digit characters (Unicode category Nd) are included.
*
* Strategy: Int32Array of size (maxCodePoint - minCodePoint + 1).
* Value 0xFF means "not a digit". Value 0-9 is the ASCII digit value.
* This gives O(1) lookup with no branching, no bisect, no loop.
*
* Memory: range is 0x0660 to 0x1FBF0 → ~129,936 entries × 1 byte = ~127 KB.
* Acceptable for a one-time init; lookup is a single array index.
*/
const SCRIPT_ZEROS = [
	48,
	1632,
	1776,
	2406,
	2534,
	2662,
	2790,
	2918,
	3046,
	3174,
	3302,
	3430,
	3558,
	3664,
	3792,
	3872,
	4160,
	4240,
	6112,
	6160,
	6470,
	6608,
	6784,
	6800,
	6992,
	7088,
	7232,
	7248,
	65296,
	120782,
	120792,
	120802,
	120812,
	120822,
	66720,
	68912,
	69734,
	69872,
	69942,
	70096,
	70384,
	70736,
	70864,
	71248,
	71360,
	71472,
	71904,
	72016,
	72688,
	72784,
	73040,
	73120,
	73552,
	92768,
	92864,
	93008,
	123200,
	123632,
	124144,
	125264,
	130032
];
const HIGH_MAP = /* @__PURE__ */ new Map();
const LOW_MAX = 65535;
const TABLE_OFFSET = 1632;
const TABLE = new Uint8Array(63904).fill(255);
for (const zero of SCRIPT_ZEROS) for (let d = 0; d < 10; d++) {
	const cp = zero + d;
	if (cp <= LOW_MAX) TABLE[cp - TABLE_OFFSET] = d;
	else HIGH_MAP.set(cp, d);
}
//#endregion
//#region ../../../node_modules/.pnpm/anynum@1.0.1/node_modules/anynum/anynum.js
const CHAR_0 = 48;
const CHAR_9 = 57;
const CHAR_MINUS = 45;
const MINUS_SET = new Set([
	8722,
	65293,
	65123
]);
/**
* Normalize all Unicode decimal digit characters in a string to ASCII (0-9),
* and normalize Unicode minus variants to ASCII '-' (U+002D).
*
* Non-digit, non-minus characters are passed through unchanged.
*
* Performance design:
* - Fast path: if the string has no convertible characters, return it unchanged
*   (zero allocation).
* - BMP digits (0x0660..0xFFFF excl. surrogates): flat Uint8Array lookup (O(1)).
* - Supplementary plane digits (> 0xFFFF, encoded as surrogate pairs): Map lookup.
* - Minus variants: checked inline with a small fixed Set.
*
* @param {string} str
* @returns {string}
*/
function anynum(str) {
	if (typeof str !== "string") return str;
	const len = str.length;
	if (len === 0) return str;
	let firstHit = -1;
	for (let i = 0; i < len; i++) {
		const cc = str.charCodeAt(i);
		if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) continue;
		if (cc < 1632) {
			if (MINUS_SET.has(cc)) {
				firstHit = i;
				break;
			}
			continue;
		}
		if (cc >= 55296 && cc <= 56319) {
			if (i + 1 < len) {
				const low = str.charCodeAt(i + 1);
				if (low >= 56320 && low <= 57343) {
					const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
					if (HIGH_MAP.has(cp)) {
						firstHit = i;
						break;
					}
				}
			}
			continue;
		}
		if (TABLE[cc - 1632] !== 255 || MINUS_SET.has(cc)) {
			firstHit = i;
			break;
		}
	}
	if (firstHit === -1) return str;
	const chars = [];
	if (firstHit > 0) chars.push(str.slice(0, firstHit));
	for (let i = firstHit; i < len; i++) {
		const cc = str.charCodeAt(i);
		if (cc >= CHAR_0 && cc <= CHAR_9 || cc === CHAR_MINUS) {
			chars.push(str[i]);
			continue;
		}
		if (cc < 1632) {
			chars.push(MINUS_SET.has(cc) ? "-" : str[i]);
			continue;
		}
		if (cc >= 55296 && cc <= 56319) {
			if (i + 1 < len) {
				const low = str.charCodeAt(i + 1);
				if (low >= 56320 && low <= 57343) {
					const cp = 65536 + (cc - 55296 << 10) + (low - 56320);
					const d = HIGH_MAP.get(cp);
					if (d !== void 0) {
						chars.push(String.fromCharCode(d + 48));
						i++;
						continue;
					}
				}
			}
			chars.push(str[i]);
			continue;
		}
		if (MINUS_SET.has(cc)) {
			chars.push("-");
			continue;
		}
		const d = TABLE[cc - TABLE_OFFSET];
		chars.push(d !== 255 ? String.fromCharCode(d + 48) : str[i]);
	}
	return chars.join("");
}
//#endregion
//#region ../../../node_modules/.pnpm/strnum@2.4.2/node_modules/strnum/strnum.js
const hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
const binRegex = /^0b[01]+$/;
const octRegex = /^0o[0-7]+$/;
const numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
const consider = {
	hex: true,
	binary: false,
	octal: false,
	leadingZeros: true,
	decimalPoint: ".",
	eNotation: true,
	infinity: "original",
	unicode: false
};
function toNumber(str, options = {}) {
	options = Object.assign({}, consider, options);
	if (!str || typeof str !== "string") return str;
	let trimmedStr = str.trim();
	if (trimmedStr.length === 0) return str;
	else if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
	else if (trimmedStr === "0") return 0;
	if (options.unicode) {
		trimmedStr = anynum(trimmedStr);
		if (trimmedStr === "0") return 0;
	}
	if (options.hex && hexRegex.test(trimmedStr)) return parse_int(trimmedStr, 16);
	else if (options.binary && binRegex.test(trimmedStr)) return parse_int(trimmedStr, 2);
	else if (options.octal && octRegex.test(trimmedStr)) return parse_int(trimmedStr, 8);
	else if (!isFinite(trimmedStr)) return handleInfinity(str, Number(trimmedStr), options);
	else if (trimmedStr.includes("e") || trimmedStr.includes("E")) return resolveEnotation(str, trimmedStr, options);
	else {
		const match = numRegex.exec(trimmedStr);
		if (match) {
			const sign = match[1] || "";
			const leadingZeros = match[2];
			let numTrimmedByZeros = trimZeros(match[3]);
			const decimalAdjacentToLeadingZeros = sign ? str[leadingZeros.length + 1] === "." : str[leadingZeros.length] === ".";
			if (!options.leadingZeros && (leadingZeros.length > 1 || leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros)) return str;
			else {
				const num = Number(trimmedStr);
				const parsedStr = String(num);
				if (num === 0) return num;
				if (parsedStr.search(/[eE]/) !== -1) if (options.eNotation) return num;
				else return str;
				else if (trimmedStr.indexOf(".") !== -1) if (parsedStr === "0") return num;
				else if (parsedStr === numTrimmedByZeros) return num;
				else if (parsedStr === `${sign}${numTrimmedByZeros}`) return num;
				else return str;
				let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
				if (leadingZeros) return n === parsedStr || sign + n === parsedStr ? num : str;
				else return n === parsedStr || n === sign + parsedStr ? num : str;
			}
		} else return str;
	}
}
const eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str, trimmedStr, options) {
	if (!options.eNotation) return str;
	const notation = trimmedStr.match(eNotationRegx);
	if (notation) {
		let sign = notation[1] || "";
		const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
		const leadingZeros = notation[2];
		const eAdjacentToLeadingZeros = sign ? str[leadingZeros.length + 1] === eChar : str[leadingZeros.length] === eChar;
		if (leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str;
		else if (leadingZeros.length === 1 && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)) return Number(trimmedStr);
		else if (leadingZeros.length > 0) if (options.leadingZeros && !eAdjacentToLeadingZeros) {
			trimmedStr = (notation[1] || "") + notation[3];
			return Number(trimmedStr);
		} else return str;
		else return Number(trimmedStr);
	} else return str;
}
/**
* 
* @param {string} numStr without leading zeros
* @returns 
*/
function trimZeros(numStr) {
	if (numStr && numStr.indexOf(".") !== -1) {
		let end = numStr.length;
		while (end > 0 && numStr.charCodeAt(end - 1) === 48) end--;
		numStr = numStr.slice(0, end);
		if (numStr === ".") numStr = "0";
		else if (numStr[0] === ".") numStr = "0" + numStr;
		else if (numStr[numStr.length - 1] === ".") numStr = numStr.substring(0, numStr.length - 1);
		return numStr;
	}
	return numStr;
}
function parse_int(numStr, base) {
	const str = numStr.trim();
	if (base === 2 || base === 8) numStr = str.substring(2);
	if (parseInt) return parseInt(numStr, base);
	else if (Number.parseInt) return Number.parseInt(numStr, base);
	else if (window && window.parseInt) return window.parseInt(numStr, base);
	else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
/**
* Handle infinite values based on user option
* @param {string} str - original input string
* @param {number} num - parsed number (Infinity or -Infinity)
* @param {object} options - user options
* @returns {string|number|null} based on infinity option
*/
function handleInfinity(str, num, options) {
	const isPositive = num === Infinity;
	switch (options.infinity.toLowerCase()) {
		case "null": return null;
		case "infinity": return num;
		case "string": return isPositive ? "Infinity" : "-Infinity";
		default: return str;
	}
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
	if (typeof ignoreAttributes === "function") return ignoreAttributes;
	if (Array.isArray(ignoreAttributes)) return (attrName) => {
		for (const pattern of ignoreAttributes) {
			if (typeof pattern === "string" && attrName === pattern) return true;
			if (pattern instanceof RegExp && pattern.test(attrName)) return true;
		}
	};
	return () => false;
}
//#endregion
//#region ../../../node_modules/.pnpm/path-expression-matcher@1.6.2/node_modules/path-expression-matcher/src/Expression.js
/**
* Expression - Parses and stores a tag pattern expression
* 
* Patterns are parsed once and stored in an optimized structure for fast matching.
* 
* @example
* const expr = new Expression("root.users.user");
* const expr2 = new Expression("..user[id]:first");
* const expr3 = new Expression("root/users/user", { separator: '/' });
*/
var Expression = class {
	/**
	* Create a new Expression
	* @param {string} pattern - Pattern string (e.g., "root.users.user", "..user[id]")
	* @param {Object} options - Configuration options
	* @param {string} options.separator - Path separator (default: '.')
	*/
	constructor(pattern, options = {}, data) {
		this.pattern = pattern;
		this.separator = options.separator || ".";
		this.segments = this._parse(pattern);
		this.data = data;
		this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
		this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== void 0);
		this._hasPositionSelector = this.segments.some((seg) => seg.position !== void 0);
	}
	/**
	* Parse pattern string into segments
	* @private
	* @param {string} pattern - Pattern to parse
	* @returns {Array} Array of segment objects
	*/
	_parse(pattern) {
		const segments = [];
		let i = 0;
		let currentPart = "";
		while (i < pattern.length) if (pattern[i] === this.separator) if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
			if (currentPart.trim()) {
				segments.push(this._parseSegment(currentPart.trim()));
				currentPart = "";
			}
			segments.push({ type: "deep-wildcard" });
			i += 2;
		} else {
			if (currentPart.trim()) segments.push(this._parseSegment(currentPart.trim()));
			currentPart = "";
			i++;
		}
		else {
			currentPart += pattern[i];
			i++;
		}
		if (currentPart.trim()) segments.push(this._parseSegment(currentPart.trim()));
		return segments;
	}
	/**
	* Parse a single segment
	* @private
	* @param {string} part - Segment string (e.g., "user", "ns::user", "user[id]", "ns::user:first")
	* @returns {Object} Segment object
	*/
	_parseSegment(part) {
		const segment = { type: "tag" };
		let bracketContent = null;
		let withoutBrackets = part;
		const bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
		if (bracketMatch) {
			withoutBrackets = bracketMatch[1] + bracketMatch[3];
			if (bracketMatch[2]) {
				const content = bracketMatch[2].slice(1, -1);
				if (content) bracketContent = content;
			}
		}
		let namespace = void 0;
		let tagAndPosition = withoutBrackets;
		if (withoutBrackets.includes("::")) {
			const nsIndex = withoutBrackets.indexOf("::");
			namespace = withoutBrackets.substring(0, nsIndex).trim();
			tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
			if (!namespace) throw new Error(`Invalid namespace in pattern: ${part}`);
		}
		let tag = void 0;
		let positionMatch = null;
		if (tagAndPosition.includes(":")) {
			const colonIndex = tagAndPosition.lastIndexOf(":");
			const tagPart = tagAndPosition.substring(0, colonIndex).trim();
			const posPart = tagAndPosition.substring(colonIndex + 1).trim();
			if ([
				"first",
				"last",
				"odd",
				"even"
			].includes(posPart) || /^nth\(\d+\)$/.test(posPart)) {
				tag = tagPart;
				positionMatch = posPart;
			} else tag = tagAndPosition;
		} else tag = tagAndPosition;
		if (!tag) throw new Error(`Invalid segment pattern: ${part}`);
		segment.tag = tag;
		if (namespace) segment.namespace = namespace;
		if (bracketContent) if (bracketContent.includes("=")) {
			const eqIndex = bracketContent.indexOf("=");
			segment.attrName = bracketContent.substring(0, eqIndex).trim();
			segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
		} else segment.attrName = bracketContent.trim();
		if (positionMatch) {
			const nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
			if (nthMatch) {
				segment.position = "nth";
				segment.positionValue = parseInt(nthMatch[1], 10);
			} else segment.position = positionMatch;
		}
		return segment;
	}
	/**
	* Get the number of segments
	* @returns {number}
	*/
	get length() {
		return this.segments.length;
	}
	/**
	* Check if expression contains deep wildcard
	* @returns {boolean}
	*/
	hasDeepWildcard() {
		return this._hasDeepWildcard;
	}
	/**
	* Check if expression has attribute conditions
	* @returns {boolean}
	*/
	hasAttributeCondition() {
		return this._hasAttributeCondition;
	}
	/**
	* Check if expression has position selectors
	* @returns {boolean}
	*/
	hasPositionSelector() {
		return this._hasPositionSelector;
	}
	/**
	* Get string representation
	* @returns {string}
	*/
	toString() {
		return this.pattern;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/path-expression-matcher@1.6.2/node_modules/path-expression-matcher/src/ExpressionSet.js
/**
* ExpressionSet - An indexed collection of Expressions for efficient bulk matching
*
* Instead of iterating all expressions on every tag, ExpressionSet pre-indexes
* them at insertion time by depth and terminal tag name. At match time, only
* the relevant bucket is evaluated — typically reducing checks from O(E) to O(1)
* lookup plus O(small bucket) matches.
*
* Three buckets are maintained:
*  - `_byDepthAndTag`  — exact depth + exact tag name  (tightest, used first)
*  - `_wildcardByDepth` — exact depth + wildcard tag `*` (depth-matched only)
*  - `_deepWildcards`  — expressions containing `..`  (cannot be depth-indexed)
*
* @example
* import { Expression, ExpressionSet } from 'fast-xml-tagger';
*
* // Build once at config time
* const stopNodes = new ExpressionSet();
* stopNodes.add(new Expression('root.users.user'));
* stopNodes.add(new Expression('root.config.setting'));
* stopNodes.add(new Expression('..script'));
*
* // Query on every tag — hot path
* if (stopNodes.matchesAny(matcher)) { ... }
*/
var ExpressionSet = class {
	constructor() {
		/** @type {Map<string, import('./Expression.js').default[]>} depth:tag → expressions */
		this._byDepthAndTag = /* @__PURE__ */ new Map();
		/** @type {Map<number, import('./Expression.js').default[]>} depth → wildcard-tag expressions */
		this._wildcardByDepth = /* @__PURE__ */ new Map();
		/** @type {import('./Expression.js').default[]} expressions containing deep wildcard (..) */
		this._deepWildcards = [];
		/** @type {Map<string, import('./Expression.js').default[]>} terminalTag → deep wildcard expressions */
		this._deepByTerminalTag = /* @__PURE__ */ new Map();
		/** @type {Set<string>} pattern strings already added — used for deduplication */
		this._patterns = /* @__PURE__ */ new Set();
		/** @type {boolean} whether the set is sealed against further additions */
		this._sealed = false;
	}
	/**
	* Add an Expression to the set.
	* Duplicate patterns (same pattern string) are silently ignored.
	*
	* @param {import('./Expression.js').default} expression - A pre-constructed Expression instance
	* @returns {this} for chaining
	* @throws {TypeError} if called after seal()
	*
	* @example
	* set.add(new Expression('root.users.user'));
	* set.add(new Expression('..script'));
	*/
	add(expression) {
		if (this._sealed) throw new TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");
		if (this._patterns.has(expression.pattern)) return this;
		this._patterns.add(expression.pattern);
		if (expression.hasDeepWildcard()) {
			const lastSeg = expression.segments[expression.segments.length - 1];
			if (lastSeg && lastSeg.type !== "deep-wildcard" && lastSeg.tag !== "*") {
				const tag = lastSeg.tag;
				if (!this._deepByTerminalTag.has(tag)) this._deepByTerminalTag.set(tag, []);
				this._deepByTerminalTag.get(tag).push(expression);
			} else this._deepWildcards.push(expression);
			return this;
		}
		const depth = expression.length;
		const tag = expression.segments[expression.segments.length - 1]?.tag;
		if (!tag || tag === "*") {
			if (!this._wildcardByDepth.has(depth)) this._wildcardByDepth.set(depth, []);
			this._wildcardByDepth.get(depth).push(expression);
		} else {
			const key = `${depth}:${tag}`;
			if (!this._byDepthAndTag.has(key)) this._byDepthAndTag.set(key, []);
			this._byDepthAndTag.get(key).push(expression);
		}
		return this;
	}
	/**
	* Add multiple expressions at once.
	*
	* @param {import('./Expression.js').default[]} expressions - Array of Expression instances
	* @returns {this} for chaining
	*
	* @example
	* set.addAll([
	*   new Expression('root.users.user'),
	*   new Expression('root.config.setting'),
	* ]);
	*/
	addAll(expressions) {
		for (const expr of expressions) this.add(expr);
		return this;
	}
	/**
	* Check whether a pattern string is already present in the set.
	*
	* @param {import('./Expression.js').default} expression
	* @returns {boolean}
	*/
	has(expression) {
		return this._patterns.has(expression.pattern);
	}
	/**
	* Number of expressions in the set.
	* @type {number}
	*/
	get size() {
		return this._patterns.size;
	}
	/**
	* Seal the set against further modifications.
	* Useful to prevent accidental mutations after config is built.
	* Calling add() or addAll() on a sealed set throws a TypeError.
	*
	* @returns {this}
	*/
	seal() {
		this._sealed = true;
		return this;
	}
	/**
	* Whether the set has been sealed.
	* @type {boolean}
	*/
	get isSealed() {
		return this._sealed;
	}
	/**
	* Test whether the matcher's current path matches any expression in the set.
	*
	* Evaluation order (cheapest → most expensive):
	*  1. Exact depth + tag bucket  — O(1) lookup, typically 0–2 expressions
	*  2. Depth-only wildcard bucket — O(1) lookup, rare
	*  3. Deep-wildcard list         — always checked, but usually small
	*
	* @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
	* @returns {boolean} true if any expression matches the current path
	*
	* @example
	* if (stopNodes.matchesAny(matcher)) {
	*   // handle stop node
	* }
	*/
	matchesAny(matcher) {
		return this.findMatch(matcher) !== null;
	}
	/**
	* Find and return the first Expression that matches the matcher's current path.
	*
	* Uses the same evaluation order as matchesAny (cheapest → most expensive):
	*  1. Exact depth + tag bucket
	*  2. Depth-only wildcard bucket
	*  3. Deep-wildcard list
	*
	* @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
	* @returns {import('./Expression.js').default | null} the first matching Expression, or null
	*
	* @example
	* const expr = stopNodes.findMatch(matcher);
	* if (expr) {
	*   // access expr.config, expr.pattern, etc.
	* }
	*/
	findMatch(matcher) {
		const depth = matcher.getDepth();
		const tag = matcher.getCurrentTag();
		const exactKey = `${depth}:${tag}`;
		const exactBucket = this._byDepthAndTag.get(exactKey);
		if (exactBucket) {
			for (let i = 0; i < exactBucket.length; i++) if (matcher.matches(exactBucket[i])) return exactBucket[i];
		}
		const wildcardBucket = this._wildcardByDepth.get(depth);
		if (wildcardBucket) {
			for (let i = 0; i < wildcardBucket.length; i++) if (matcher.matches(wildcardBucket[i])) return wildcardBucket[i];
		}
		const deepBucket = this._deepByTerminalTag.get(tag);
		if (deepBucket) {
			for (let i = 0; i < deepBucket.length; i++) if (matcher.matches(deepBucket[i])) return deepBucket[i];
		}
		for (let i = 0; i < this._deepWildcards.length; i++) if (matcher.matches(this._deepWildcards[i])) return this._deepWildcards[i];
		return null;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/path-expression-matcher@1.6.2/node_modules/path-expression-matcher/src/Matcher.js
/**
* MatcherView - A lightweight read-only view over a Matcher's internal state.
*
* Created once by Matcher and reused across all callbacks. Holds a direct
* reference to the parent Matcher so it always reflects current parser state
* with zero copying or freezing overhead.
*
* Users receive this via {@link Matcher#readOnly} or directly from parser
* callbacks. It exposes all query and matching methods but has no mutation
* methods — misuse is caught at the TypeScript level rather than at runtime.
*
* @example
* const matcher = new Matcher();
* const view = matcher.readOnly();
*
* matcher.push("root", {});
* view.getCurrentTag(); // "root"
* view.getDepth();      // 1
*/
var MatcherView = class {
	/**
	* @param {Matcher} matcher - The parent Matcher instance to read from.
	*/
	constructor(matcher) {
		this._matcher = matcher;
	}
	/**
	* Get the path separator used by the parent matcher.
	* @returns {string}
	*/
	get separator() {
		return this._matcher.separator;
	}
	/**
	* Get current tag name.
	* @returns {string|undefined}
	*/
	getCurrentTag() {
		const path = this._matcher.path;
		return path.length > 0 ? path[path.length - 1].tag : void 0;
	}
	/**
	* Get current namespace.
	* @returns {string|undefined}
	*/
	getCurrentNamespace() {
		const path = this._matcher.path;
		return path.length > 0 ? path[path.length - 1].namespace : void 0;
	}
	/**
	* Get current node's attribute value.
	* @param {string} attrName
	* @returns {*}
	*/
	getAttrValue(attrName) {
		const path = this._matcher.path;
		if (path.length === 0) return void 0;
		return path[path.length - 1].values?.[attrName];
	}
	/**
	* Check if current node has an attribute.
	* @param {string} attrName
	* @returns {boolean}
	*/
	hasAttr(attrName) {
		const path = this._matcher.path;
		if (path.length === 0) return false;
		const current = path[path.length - 1];
		return current.values !== void 0 && attrName in current.values;
	}
	/**
	* Get the value of a "kept" attribute from the nearest ancestor (or
	* current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
	* @param {string} attrName
	* @returns {*}
	*/
	getAnyParentAttr(attrName) {
		return this._matcher.getAnyParentAttr(attrName);
	}
	/**
	* Check whether any ancestor (or the current node) kept the given
	* attribute via `push(tag, attrs, ns, { keep: [...] })`.
	* @param {string} attrName
	* @returns {boolean}
	*/
	hasAnyParentAttr(attrName) {
		return this._matcher.hasAnyParentAttr(attrName);
	}
	/**
	* Get current node's sibling position (child index in parent).
	* @returns {number}
	*/
	getPosition() {
		const path = this._matcher.path;
		if (path.length === 0) return -1;
		return path[path.length - 1].position ?? 0;
	}
	/**
	* Get current node's repeat counter (occurrence count of this tag name).
	* @returns {number}
	*/
	getCounter() {
		const path = this._matcher.path;
		if (path.length === 0) return -1;
		return path[path.length - 1].counter ?? 0;
	}
	/**
	* Get current node's sibling index (alias for getPosition).
	* @returns {number}
	* @deprecated Use getPosition() or getCounter() instead
	*/
	getIndex() {
		return this.getPosition();
	}
	/**
	* Get current path depth.
	* @returns {number}
	*/
	getDepth() {
		return this._matcher.path.length;
	}
	/**
	* Get path as string.
	* @param {string} [separator] - Optional separator (uses default if not provided)
	* @param {boolean} [includeNamespace=true]
	* @returns {string}
	*/
	toString(separator, includeNamespace = true) {
		return this._matcher.toString(separator, includeNamespace);
	}
	/**
	* Get path as array of tag names.
	* @returns {string[]}
	*/
	toArray() {
		return this._matcher.path.map((n) => n.tag);
	}
	/**
	* Match current path against an Expression.
	* @param {Expression} expression
	* @returns {boolean}
	*/
	matches(expression) {
		return this._matcher.matches(expression);
	}
	/**
	* Match any expression in the given set against the current path.
	* @param {ExpressionSet} exprSet
	* @returns {boolean}
	*/
	matchesAny(exprSet) {
		return exprSet.matchesAny(this._matcher);
	}
};
/**
* Matcher - Tracks current path in XML/JSON tree and matches against Expressions.
*
* The matcher maintains a stack of nodes representing the current path from root to
* current tag. It only stores attribute values for the current (top) node to minimize
* memory usage. Sibling tracking is used to auto-calculate position and counter.
*
* Use {@link Matcher#readOnly} to obtain a {@link MatcherView} safe to pass to
* user callbacks — it always reflects current state with no Proxy overhead.
*
* @example
* const matcher = new Matcher();
* matcher.push("root", {});
* matcher.push("users", {});
* matcher.push("user", { id: "123", type: "admin" });
*
* const expr = new Expression("root.users.user");
* matcher.matches(expr); // true
*/
var Matcher = class {
	/**
	* Create a new Matcher.
	* @param {Object} [options={}]
	* @param {string} [options.separator='.'] - Default path separator
	*/
	constructor(options = {}) {
		this.separator = options.separator || ".";
		this.path = [];
		this.siblingStacks = [];
		this._pathStringCache = null;
		this._view = new MatcherView(this);
		this._keptAttrs = [];
	}
	/**
	* Push a new tag onto the path.
	* @param {string} tagName
	* @param {Object|null} [attrValues=null]
	* @param {string|null} [namespace=null]
	* @param {Object|null} [options=null]
	* @param {string[]} [options.keep] - Names of attributes (from attrValues)
	*/
	push(tagName, attrValues = null, namespace = null, options = null) {
		this._pathStringCache = null;
		if (this.path.length > 0) this.path[this.path.length - 1].values = void 0;
		const currentLevel = this.path.length;
		let level = this.siblingStacks[currentLevel];
		if (!level) {
			level = {
				counts: /* @__PURE__ */ new Map(),
				total: 0
			};
			this.siblingStacks[currentLevel] = level;
		}
		const siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
		const counter = level.counts.get(siblingKey) || 0;
		const position = level.total;
		level.counts.set(siblingKey, counter + 1);
		level.total++;
		const node = {
			tag: tagName,
			position,
			counter
		};
		if (namespace !== null && namespace !== void 0) node.namespace = namespace;
		if (attrValues !== null && attrValues !== void 0) node.values = attrValues;
		this.path.push(node);
		const depth = this.path.length;
		const keep = options !== null ? options.keep : null;
		if (keep !== null && keep !== void 0 && keep.length > 0 && attrValues) for (let i = 0; i < keep.length; i++) {
			const name = keep[i];
			if (attrValues[name] !== void 0) this._keptAttrs.push({
				depth,
				name,
				value: attrValues[name]
			});
		}
	}
	/**
	* Pop the last tag from the path.
	* @returns {Object|undefined} The popped node
	*/
	pop() {
		if (this.path.length === 0) return void 0;
		this._pathStringCache = null;
		const node = this.path.pop();
		if (this.siblingStacks.length > this.path.length + 1) this.siblingStacks.length = this.path.length + 1;
		const poppedDepth = this.path.length + 1;
		while (this._keptAttrs.length > 0 && this._keptAttrs[this._keptAttrs.length - 1].depth >= poppedDepth) this._keptAttrs.pop();
		return node;
	}
	/**
	* Update current node's attribute values.
	* Useful when attributes are parsed after push.
	* @param {Object} attrValues
	*/
	updateCurrent(attrValues) {
		if (this.path.length > 0) {
			const current = this.path[this.path.length - 1];
			if (attrValues !== null && attrValues !== void 0) current.values = attrValues;
		}
	}
	/**
	* Get current tag name.
	* @returns {string|undefined}
	*/
	getCurrentTag() {
		return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
	}
	/**
	* Get current namespace.
	* @returns {string|undefined}
	*/
	getCurrentNamespace() {
		return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
	}
	/**
	* Get current node's attribute value.
	* @param {string} attrName
	* @returns {*}
	*/
	getAttrValue(attrName) {
		if (this.path.length === 0) return void 0;
		return this.path[this.path.length - 1].values?.[attrName];
	}
	/**
	* Check if current node has an attribute.
	* @param {string} attrName
	* @returns {boolean}
	*/
	hasAttr(attrName) {
		if (this.path.length === 0) return false;
		const current = this.path[this.path.length - 1];
		return current.values !== void 0 && attrName in current.values;
	}
	/**
	* Get the value of a "kept" attribute from the nearest ancestor (or
	* current node) that declared it via `push(tag, attrs, ns, { keep: [...] })`.
	* Unlike getAttrValue(), this works regardless of how deep the path has
	* gone since the attribute was pushed — but only for attribute names that
	* were explicitly marked with `keep` at push time. Cost is proportional to
	* the number of currently-kept attributes (typically 0-3), not path depth.
	* @param {string} attrName
	* @returns {*} the value, or undefined if no ancestor kept this attribute
	*/
	getAnyParentAttr(attrName) {
		const kept = this._keptAttrs;
		for (let i = kept.length - 1; i >= 0; i--) if (kept[i].name === attrName) return kept[i].value;
	}
	/**
	* Check whether any ancestor (or the current node) kept the given
	* attribute via `push(tag, attrs, ns, { keep: [...] })`.
	* @param {string} attrName
	* @returns {boolean}
	*/
	hasAnyParentAttr(attrName) {
		const kept = this._keptAttrs;
		for (let i = kept.length - 1; i >= 0; i--) if (kept[i].name === attrName) return true;
		return false;
	}
	/**
	* Get current node's sibling position (child index in parent).
	* @returns {number}
	*/
	getPosition() {
		if (this.path.length === 0) return -1;
		return this.path[this.path.length - 1].position ?? 0;
	}
	/**
	* Get current node's repeat counter (occurrence count of this tag name).
	* @returns {number}
	*/
	getCounter() {
		if (this.path.length === 0) return -1;
		return this.path[this.path.length - 1].counter ?? 0;
	}
	/**
	* Get current node's sibling index (alias for getPosition).
	* @returns {number}
	* @deprecated Use getPosition() or getCounter() instead
	*/
	getIndex() {
		return this.getPosition();
	}
	/**
	* Get current path depth.
	* @returns {number}
	*/
	getDepth() {
		return this.path.length;
	}
	/**
	* Get path as string.
	* @param {string} [separator] - Optional separator (uses default if not provided)
	* @param {boolean} [includeNamespace=true]
	* @returns {string}
	*/
	toString(separator, includeNamespace = true) {
		const sep = separator || this.separator;
		if (sep === this.separator && includeNamespace === true) {
			if (this._pathStringCache !== null) return this._pathStringCache;
			const result = this.path.map((n) => n.namespace ? `${n.namespace}:${n.tag}` : n.tag).join(sep);
			this._pathStringCache = result;
			return result;
		}
		return this.path.map((n) => includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag).join(sep);
	}
	/**
	* Get path as array of tag names.
	* @returns {string[]}
	*/
	toArray() {
		return this.path.map((n) => n.tag);
	}
	/**
	* Reset the path to empty.
	*/
	reset() {
		this._pathStringCache = null;
		this.path = [];
		this.siblingStacks = [];
		this._keptAttrs = [];
	}
	/**
	* Match current path against an Expression.
	* @param {Expression} expression
	* @returns {boolean}
	*/
	matches(expression) {
		const segments = expression.segments;
		if (segments.length === 0) return false;
		if (expression.hasDeepWildcard()) return this._matchWithDeepWildcard(segments);
		return this._matchSimple(segments);
	}
	/**
	* @private
	*/
	_matchSimple(segments) {
		if (this.path.length !== segments.length) return false;
		for (let i = 0; i < segments.length; i++) if (!this._matchSegment(segments[i], this.path[i], i === this.path.length - 1)) return false;
		return true;
	}
	/**
	* @private
	*/
	_matchWithDeepWildcard(segments) {
		let pathIdx = this.path.length - 1;
		let segIdx = segments.length - 1;
		while (segIdx >= 0 && pathIdx >= 0) {
			const segment = segments[segIdx];
			if (segment.type === "deep-wildcard") {
				segIdx--;
				if (segIdx < 0) return true;
				const nextSeg = segments[segIdx];
				let found = false;
				for (let i = pathIdx; i >= 0; i--) if (this._matchSegment(nextSeg, this.path[i], i === this.path.length - 1)) {
					pathIdx = i - 1;
					segIdx--;
					found = true;
					break;
				}
				if (!found) return false;
			} else {
				if (!this._matchSegment(segment, this.path[pathIdx], pathIdx === this.path.length - 1)) return false;
				pathIdx--;
				segIdx--;
			}
		}
		return segIdx < 0;
	}
	/**
	* @private
	*/
	_matchSegment(segment, node, isCurrentNode) {
		if (segment.tag !== "*" && segment.tag !== node.tag) return false;
		if (segment.namespace !== void 0) {
			if (segment.namespace !== "*" && segment.namespace !== node.namespace) return false;
		}
		if (segment.attrName !== void 0) {
			if (!isCurrentNode) return false;
			if (!node.values || !(segment.attrName in node.values)) return false;
			if (segment.attrValue !== void 0) {
				if (String(node.values[segment.attrName]) !== String(segment.attrValue)) return false;
			}
		}
		if (segment.position !== void 0) {
			if (!isCurrentNode) return false;
			const counter = node.counter ?? 0;
			if (segment.position === "first" && counter !== 0) return false;
			else if (segment.position === "odd" && counter % 2 !== 1) return false;
			else if (segment.position === "even" && counter % 2 !== 0) return false;
			else if (segment.position === "nth" && counter !== segment.positionValue) return false;
		}
		return true;
	}
	/**
	* Match any expression in the given set against the current path.
	* @param {ExpressionSet} exprSet
	* @returns {boolean}
	*/
	matchesAny(exprSet) {
		return exprSet.matchesAny(this);
	}
	/**
	* Create a snapshot of current state.
	* @returns {Object}
	*/
	snapshot() {
		return {
			path: this.path.map((node) => ({ ...node })),
			siblingStacks: this.siblingStacks.map((level) => level ? {
				counts: new Map(level.counts),
				total: level.total
			} : level),
			keptAttrs: this._keptAttrs.map((entry) => ({ ...entry }))
		};
	}
	/**
	* Restore state from snapshot.
	* @param {Object} snapshot
	*/
	restore(snapshot) {
		this._pathStringCache = null;
		this.path = snapshot.path.map((node) => ({ ...node }));
		this.siblingStacks = snapshot.siblingStacks.map((level) => level ? {
			counts: new Map(level.counts),
			total: level.total
		} : level);
		this._keptAttrs = (snapshot.keptAttrs || []).map((entry) => ({ ...entry }));
	}
	/**
	* Return the read-only {@link MatcherView} for this matcher.
	*
	* The same instance is returned on every call — no allocation occurs.
	* It always reflects the current parser state and is safe to pass to
	* user callbacks without risk of accidental mutation.
	*
	* @returns {MatcherView}
	*
	* @example
	* const view = matcher.readOnly();
	* // pass view to callbacks — it stays in sync automatically
	* view.matches(expr);       // ✓
	* view.getCurrentTag();     // ✓
	* // view.push(...)         // ✗ method does not exist — caught by TypeScript
	*/
	readOnly() {
		return this._view;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/html.js
/**
* HTML context patterns.
*
* Detects XSS vectors that are dangerous when a string ends up rendered as HTML.
* All patterns use bounded quantifiers to ensure linear-time matching (ReDoS-safe).
*
* Each entry is { pattern: RegExp, id: string, description: string }
* so callers can inspect which rule fired if they need to.
*/
const HTML_PATTERNS = [
	{
		id: "html-script-open",
		description: "<script opening tag",
		pattern: /<script[\s>/]/i
	},
	{
		id: "html-script-close",
		description: "<\/script closing tag",
		pattern: /<\/script[\s>]/i
	},
	{
		id: "html-javascript-protocol",
		description: "javascript: URI scheme (with optional whitespace/encoding)",
		pattern: /j[\t\n\r ]*a[\t\n\r ]*v[\t\n\r ]*a[\t\n\r ]*s[\t\n\r ]*c[\t\n\r ]*r[\t\n\r ]*i[\t\n\r ]*p[\t\n\r ]*t[\t\n\r ]*:/i
	},
	{
		id: "html-vbscript-protocol",
		description: "vbscript: URI scheme",
		pattern: /vbscript[\t\n\r ]*:/i
	},
	{
		id: "html-data-html",
		description: "data:text/html URI — can execute scripts in browsers",
		pattern: /data[\t\n\r ]*:[\t\n\r ]*text\/html/i
	},
	{
		id: "html-data-xhtml",
		description: "data:application/xhtml+xml URI",
		pattern: /data[\t\n\r ]*:[\t\n\r ]*application\/xhtml/i
	},
	{
		id: "html-data-svg",
		description: "data:image/svg+xml URI — can execute scripts",
		pattern: /data[\t\n\r ]*:[\t\n\r ]*image\/svg\+xml/i
	},
	{
		id: "html-inline-event-handler",
		description: "Inline event handler attributes: onclick=, onerror=, onload=, etc.",
		pattern: /\bon\w{1,30}\s*=/i
	},
	{
		id: "html-entity-obfuscated-script",
		description: "HTML-entity-encoded <script (e.g. &#x3C;script or &lt;script)",
		pattern: /(?:&#x0*3[Cc];?|&#0*60;?|&lt;)\s*script/i
	},
	{
		id: "html-entity-obfuscated-javascript",
		description: "HTML-entity-encoded javascript: (partial — catches common &#106; or &#x6a; for \"j\")",
		pattern: /(?:&#x0*6[Aa];?|&#0*106;?)\s*(?:&#x0*61;?|a)[\s\S]{0,80}script\s*:/i
	},
	{
		id: "html-style-expression",
		description: "CSS expression() — IE-era code execution in style attributes",
		pattern: /style[\s\S]{0,20}expression\s*\(/i
	},
	{
		id: "html-object-embed",
		description: "<object or <embed tags that can load active content",
		pattern: /<(?:object|embed)[\s>/]/i
	},
	{
		id: "html-base-tag",
		description: "<base href= — can hijack all relative URLs on a page",
		pattern: /<base[\s>]/i
	},
	{
		id: "html-meta-refresh",
		description: "<meta http-equiv=\"refresh\" — can redirect users",
		pattern: /<meta[\s\S]{0,40}http-equiv[\s\S]{0,20}refresh/i
	},
	{
		id: "html-srcdoc",
		description: "srcdoc= attribute on iframes — embeds HTML that can run scripts",
		pattern: /srcdoc\s*=/i
	},
	{
		id: "html-iframe",
		description: "<iframe tag",
		pattern: /<iframe[\s>/]/i
	},
	{
		id: "html-form",
		description: "<form tag — can be used for phishing / credential harvesting injection",
		pattern: /<form[\s>/]/i
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/xml.js
/**
* XML context patterns.
*
* Detects injection vectors that are specifically dangerous when a string
* is inserted into an XML document (not HTML rendering context).
*
* Key distinction from HTML: these patterns target parser-level attacks —
* things that can confuse or subvert an XML parser, trigger external entity
* resolution, or inject DTD content. HTML rendering concerns (XSS) belong
* in the HTML context.
*/
const XML_PATTERNS = [
	{
		id: "xml-cdata-injection",
		description: "CDATA section injection: <![CDATA[ breaks out of text node context",
		pattern: /<!\[CDATA\[/i
	},
	{
		id: "xml-cdata-close",
		description: "CDATA close sequence: ]]> can terminate an enclosing CDATA section",
		pattern: /\]\]>/
	},
	{
		id: "xml-processing-instruction",
		description: "XML processing instruction: <?xml-stylesheet or <?php etc.",
		pattern: /<\?(?:xml[\- ]|php|asp)/i
	},
	{
		id: "xml-doctype-injection",
		description: "DOCTYPE declaration embedded in content — can define entities",
		pattern: /<!DOCTYPE(?:[\s[]|$)/i
	},
	{
		id: "xml-entity-system",
		description: "SYSTEM keyword — used in external entity declarations (XXE)",
		pattern: /\bSYSTEM\s+["']/i
	},
	{
		id: "xml-entity-public",
		description: "PUBLIC keyword — used in external entity declarations (XXE)",
		pattern: /\bPUBLIC\s+["']/i
	},
	{
		id: "xml-entity-declaration",
		description: "<!ENTITY declaration — defines entities, potential XXE or entity expansion",
		pattern: /<!ENTITY[\s%]/i
	},
	{
		id: "xml-billion-laughs",
		description: "Entity reference chaining / billion laughs: repeated &eX; style references",
		pattern: /(?:&\w{1,20};){3,}/
	},
	{
		id: "xml-namespace-confusion",
		description: "xmlns: attribute injection — can redefine namespaces to confuse parsers",
		pattern: /\bxmlns(?::\w{1,40})?\s*=/i
	},
	{
		id: "xml-comment-injection",
		description: "<!-- comment injection — can hide content from some parsers",
		pattern: /<!--/
	},
	{
		id: "xml-comment-close",
		description: "--> closes an enclosing XML comment",
		pattern: /-->/
	},
	{
		id: "xml-pi-close",
		description: "?> closes an enclosing processing instruction",
		pattern: /\?>/
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/svg.js
/**
* SVG context patterns.
*
* SVG is XML-based but renders in browsers, giving it a unique attack surface
* that combines XML parser behaviour with browser rendering and JavaScript execution.
*
* Many of these vectors bypass HTML sanitizers that don't understand SVG semantics
* (DOMPurify has documented bypass vulnerabilities specifically in SVG/XML context).
*/
const SVG_PATTERNS = [
	{
		id: "svg-script-element",
		description: "<script element inside SVG executes JavaScript",
		pattern: /<script[\s>/]/i
	},
	{
		id: "svg-xlink-href-javascript",
		description: "xlink:href with javascript: — classic SVG XSS via <a> or <use>",
		pattern: /xlink\s*:\s*href\s*=\s*["']?\s*javascript\s*:/i
	},
	{
		id: "svg-href-javascript",
		description: "href= with javascript: in SVG context (<a>, <animate>, etc.)",
		pattern: /href\s*=\s*["']?\s*javascript\s*:/i
	},
	{
		id: "svg-foreignobject",
		description: "<foreignObject embeds HTML inside SVG — can execute scripts",
		pattern: /<foreignObject[\s>/]/i
	},
	{
		id: "svg-use-external",
		description: "<use xlink:href or href pointing to external resource (non-fragment URL)",
		pattern: /<use[\s\S]{0,60}(?:xlink\s*:\s*)?href\s*=\s*(?:["'][^#]|[^"'#\s>])/i
	},
	{
		id: "svg-animate-href",
		description: "<animate attributeName=\"href\" — can dynamically change href to javascript:",
		pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*href["']/i
	},
	{
		id: "svg-animate-xlinkhref",
		description: "<animate attributeName=\"xlink:href\"",
		pattern: /<animate[\s\S]{0,80}attributeName\s*=\s*["'][\s]*xlink\s*:\s*href["']/i
	},
	{
		id: "svg-set-javascript",
		description: "<set to=\"javascript:...\" — sets an attribute to a javascript: URI",
		pattern: /<set[\s\S]{0,80}to\s*=\s*["']?\s*javascript\s*:/i
	},
	{
		id: "svg-event-handler",
		description: "SVG-specific event handler attributes: onload=, onerror=, onactivate=, etc.",
		pattern: /\bon(?:load|error|activate|begin|end|repeat|focus|blur|click|mouse\w{1,20}|key\w{1,20})\s*=/i
	},
	{
		id: "svg-handler-generic",
		description: "Generic on* handler catch-all for SVG attributes",
		pattern: /\bon\w{1,30}\s*=/i
	},
	{
		id: "svg-filter-feimage",
		description: "<feImage href= — filter primitive that can load external resources",
		pattern: /<feImage[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=/i
	},
	{
		id: "svg-image-external",
		description: "<image xlink:href with http/https or javascript protocol",
		pattern: /<image[\s\S]{0,80}(?:xlink\s*:\s*)?href\s*=\s*["']?\s*(?:https?|javascript)\s*:/i
	},
	{
		id: "svg-style-javascript",
		description: "style= attribute containing javascript: (e.g. background:url(javascript:...))",
		pattern: /style\s*=[\s\S]{0,60}javascript\s*:/i
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/sql.js
/**
* SQL context patterns — high-precision rules only.
*
* These rules have very low false-positive risk and are safe to apply to
* general user text (names, descriptions, search queries, etc.).
* All patterns are ReDoS-safe — unlike the `sql-injection` npm package
* which has an active CVE on its own detection regexes.
*
* For exhaustive coverage including noisier heuristics (comment sequences,
* hex literals, stacked queries with semicolons), use 'SQL-STRICT' instead.
* Apply 'SQL-STRICT' only to strings that are specifically SQL fragments,
* not to general free-text fields.
*/
const SQL_PATTERNS = [
	{
		id: "sql-block-comment-open",
		description: "SQL block comment open: /* ... */ — unusual in legitimate user text",
		pattern: /\/\*/
	},
	{
		id: "sql-union-select",
		description: "UNION SELECT — most common SQL injection aggregation attack",
		pattern: /\bUNION\s{1,20}(?:ALL\s{1,20})?SELECT\b/i
	},
	{
		id: "sql-drop-table",
		description: "DROP TABLE — destructive DDL injection",
		pattern: /\bDROP\s{1,20}TABLE\b/i
	},
	{
		id: "sql-drop-database",
		description: "DROP DATABASE — destructive DDL injection",
		pattern: /\bDROP\s{1,20}DATABASE\b/i
	},
	{
		id: "sql-insert-into",
		description: "INSERT INTO — data injection",
		pattern: /\bINSERT\s{1,20}INTO\b/i
	},
	{
		id: "sql-delete-from",
		description: "DELETE FROM — data deletion injection",
		pattern: /\bDELETE\s{1,20}FROM\b/i
	},
	{
		id: "sql-update-set",
		description: "UPDATE ... SET — data modification injection",
		pattern: /\bUPDATE\b[\s\S]{1,60}\bSET\b/i
	},
	{
		id: "sql-exec-xp",
		description: "EXEC xp_ — MSSQL extended stored procedure execution",
		pattern: /\bEXEC(?:UTE)?\s{1,20}xp_/i
	},
	{
		id: "sql-tautology-string",
		description: "Classic string tautology: ' OR '1'='1 or \" OR \"1\"=\"1\"",
		pattern: /'\s{0,10}OR\s{0,10}'[^']{0,20}'\s*=\s*'[^']{0,20}/i
	},
	{
		id: "sql-tautology-numeric",
		description: "Numeric tautology: OR 1=1",
		pattern: /\bOR\s{1,10}1\s*=\s*1\b/i
	},
	{
		id: "sql-always-true-zero",
		description: "Numeric tautology: OR 0=0",
		pattern: /\bOR\s{1,10}0\s*=\s*0\b/i
	},
	{
		id: "sql-sleep-benchmark",
		description: "Time-based blind injection: SLEEP() or BENCHMARK()",
		pattern: /\b(?:SLEEP|BENCHMARK)\s*\(/i
	},
	{
		id: "sql-waitfor-delay",
		description: "MSSQL time-based blind injection: WAITFOR DELAY",
		pattern: /\bWAITFOR\s{1,20}DELAY\b/i
	},
	{
		id: "sql-char-function",
		description: "CHAR() function — used to obfuscate injected strings",
		pattern: /\bCHAR\s*\(\s*\d{1,3}/i
	},
	{
		id: "sql-information-schema",
		description: "INFORMATION_SCHEMA — reconnaissance query for table/column enumeration",
		pattern: /\bINFORMATION_SCHEMA\b/i
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/shell.js
/**
* SHELL context patterns.
*
* Detects shell injection vectors and path traversal patterns.
* Designed for use when a string will be passed to a shell command,
* used as a file path, or interpolated into OS-level operations.
*/
const SHELL_PATTERNS = [
	{
		id: "shell-path-traversal-unix",
		description: "Unix path traversal: ../  — climbing the directory tree",
		pattern: /\.\.\//
	},
	{
		id: "shell-path-traversal-windows",
		description: "Windows path traversal: ..\\ — climbing the directory tree",
		pattern: /\.\.\\/
	},
	{
		id: "shell-path-traversal-encoded",
		description: "URL-encoded path traversal: %2e%2e or %2f variants",
		pattern: /%2e%2e|%2f\.\.|\.\.%2f/i
	},
	{
		id: "shell-null-byte",
		description: "Null byte injection: \\x00 or %00 — truncates strings in C-backed functions",
		pattern: /\x00|%00/
	},
	{
		id: "shell-semicolon",
		description: "Semicolon command separator: cmd1; cmd2",
		pattern: /;/
	},
	{
		id: "shell-pipe",
		description: "Pipe operator: cmd1 | cmd2",
		pattern: /\|/
	},
	{
		id: "shell-and-operator",
		description: "AND operator: cmd1 && cmd2",
		pattern: /&&/
	},
	{
		id: "shell-or-operator",
		description: "OR operator: cmd1 || cmd2",
		pattern: /\|\|/
	},
	{
		id: "shell-backtick",
		description: "Backtick command substitution: `cmd`",
		pattern: /`/
	},
	{
		id: "shell-dollar-paren",
		description: "Dollar-paren command substitution: $(cmd)",
		pattern: /\$\(/
	},
	{
		id: "shell-dollar-brace",
		description: "Dollar-brace variable expansion: ${var} — can be abused for injection",
		pattern: /\$\{/
	},
	{
		id: "shell-redirect-out",
		description: "Output redirection: cmd > file or cmd >> file",
		pattern: />{1,2}/
	},
	{
		id: "shell-redirect-in",
		description: "Input redirection: cmd < file",
		pattern: /</
	},
	{
		id: "shell-newline-injection",
		description: "Newline injection: \\n or \\r — can inject new shell commands",
		pattern: /[\n\r]/
	},
	{
		id: "shell-glob-star",
		description: "Glob expansion: * or ? — can expand to unintended files",
		pattern: /[/\\][*?]/
	},
	{
		id: "shell-absolute-root",
		description: "Absolute root path injection: string starting with / or \\ (Windows UNC)",
		pattern: /^(?:\/|\\\\)/
	},
	{
		id: "shell-windows-drive",
		description: "Windows drive letter path injection: C:\\ or D:/",
		pattern: /^[a-zA-Z]:[/\\]/
	},
	{
		id: "shell-curl-wget",
		description: "curl/wget with URL or flags — can exfiltrate data or download payloads",
		pattern: /\b(?:curl|wget)\s+(?:https?:\/\/|ftp:\/\/|-)/i
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/redos.js
/**
* REDOS context patterns.
*
* Detects strings that, if used as regular expressions, could cause
* catastrophic backtracking (ReDoS — Regular Expression Denial of Service).
*
* These patterns detect the structural forms that lead to exponential or
* polynomial backtracking in NFA-based regex engines (V8, PCRE, Java, etc.).
*
* Use this context when user-supplied strings will be compiled into RegExp objects.
*/
const REDOS_PATTERNS = [
	{
		id: "redos-nested-quantifier-plus",
		description: "Nested + quantifier inside a group with outer quantifier: (a+)+, (.+b)*, etc.",
		pattern: /\([^)]*\+[^)]*\)[+*]/
	},
	{
		id: "redos-nested-quantifier-star",
		description: "Nested * quantifier: (a*)* or (a*)+ — catastrophic backtracking",
		pattern: /\([^)]*\*[^)]*\)[*+]/
	},
	{
		id: "redos-nested-groups",
		description: "Doubly nested quantified groups: ((a+)+) — guaranteed catastrophic",
		pattern: /\(\([^)]{0,40}\)[+*]\)[+*]/
	},
	{
		id: "redos-alternation-overlap",
		description: "Overlapping alternation under quantifier: (a|a)+ — ambiguous NFA paths",
		pattern: /\(([^|()]{1,20})\|(?:\1)(?:\|[^|()]{1,20}){0,5}\)[+*?]{1,2}/
	},
	{
		id: "redos-star-plus-concat",
		description: "(x*x)+ pattern — triggers super-linear backtracking",
		pattern: /\([^)]{0,10}\*[^)]{0,10}\)[+*]/
	},
	{
		id: "redos-dot-star-greedy",
		description: "(.*){n,} or (.+){n,} — repeated greedy dot quantifiers",
		pattern: /\(\.[*+]\)\{?\d/
	},
	{
		id: "redos-large-repetition",
		description: "Very large fixed or range repetition count {1000,} or {1000,n} — denial of service via backtracking",
		pattern: /\{\d{4,}(?:,\d*)?\}/
	},
	{
		id: "redos-catastrophic-alternation",
		description: "Long alternation with many similar branches — polynomial backtracking risk",
		pattern: /\([^)]{0,200}(?:\|[^|)]{0,50}){9,}\)/
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/nosql.js
const sep = "[\"'\\s]*:";
const NOSQL_PATTERNS = [
	{
		id: "nosql-where-operator",
		description: "$where — executes arbitrary JavaScript server-side in MongoDB",
		pattern: new RegExp(`\\$where${sep}`, "i")
	},
	{
		id: "nosql-ne-operator",
		description: "$ne — \"not equal\" operator used to bypass equality checks",
		pattern: new RegExp(`\\$ne${sep}`, "i")
	},
	{
		id: "nosql-gt-operator",
		description: "$gt — \"greater than\" used to bypass password/value checks",
		pattern: new RegExp(`\\$gte?${sep}`, "i")
	},
	{
		id: "nosql-lt-operator",
		description: "$lt / $lte — \"less than\" bypass variants",
		pattern: new RegExp(`\\$lte?${sep}`, "i")
	},
	{
		id: "nosql-regex-operator",
		description: "$regex — can be used to extract data character by character (blind injection)",
		pattern: new RegExp(`\\$regex${sep}`, "i")
	},
	{
		id: "nosql-or-operator",
		description: "$or — logical OR; used to create always-true conditions",
		pattern: new RegExp(`\\$or${sep}\\s*\\[`, "i")
	},
	{
		id: "nosql-and-operator",
		description: "$and — logical AND operator injection",
		pattern: new RegExp(`\\$and${sep}\\s*\\[`, "i")
	},
	{
		id: "nosql-nor-operator",
		description: "$nor — logical NOR operator injection",
		pattern: new RegExp(`\\$nor${sep}\\s*\\[`, "i")
	},
	{
		id: "nosql-exists-operator",
		description: "$exists — can enumerate fields to determine schema",
		pattern: new RegExp(`\\$exists${sep}`, "i")
	},
	{
		id: "nosql-in-operator",
		description: "$in — matches any value in a list; can enumerate values",
		pattern: new RegExp(`\\$in${sep}\\s*\\[`, "i")
	},
	{
		id: "nosql-expr-operator",
		description: "$expr — allows aggregation expressions in queries (MongoDB 3.6+)",
		pattern: new RegExp(`\\$expr${sep}`, "i")
	},
	{
		id: "nosql-function-operator",
		description: "$function — executes arbitrary JavaScript in MongoDB 4.4+",
		pattern: new RegExp(`\\$function${sep}`, "i")
	},
	{
		id: "nosql-accumulator-operator",
		description: "$accumulator — custom aggregation with arbitrary JS execution",
		pattern: new RegExp(`\\$accumulator${sep}`, "i")
	},
	{
		id: "nosql-proto-pollution",
		description: "__proto__ — prototype pollution via object key injection",
		pattern: /__proto__/
	},
	{
		id: "nosql-constructor-prototype",
		description: "constructor.prototype — alternative prototype pollution vector (dot notation or JSON key)",
		pattern: /constructor[\s"':.,{\[]*prototype/i
	},
	{
		id: "nosql-proto-bracket",
		description: "[\"__proto__\"] — bracket-notation prototype pollution",
		pattern: /\[["']__proto__["']\]/
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/log.js
/**
* LOG context patterns.
*
* Detects injection vectors that are dangerous when a string is written
* to a log file, passed to a logging framework, or interpolated into
* a log message that will be parsed or displayed.
*
* Attack categories:
*   1. CRLF injection — injects fake log lines by embedding newlines
*   2. Log4Shell (CVE-2021-44228) — ${jndi:...} triggers JNDI lookup in Log4j
*   3. SSTI in log templates — {{...}}, #{...} trigger template evaluation
*      if the log message is passed through a template engine
*   4. Null byte injection — truncates log entries in some implementations
*   5. ANSI escape injection — manipulates terminal output when logs are
*      tailed in a terminal (colour codes, cursor movement, etc.)
*
* Note: Newline characters (\n, \r) will produce false positives for
* multi-line legitimate values. Use this context only for single-line
* log field values (usernames, IDs, request parameters, etc.).
*/
const LOG_PATTERNS = [
	{
		id: "log-crlf-injection",
		description: "CRLF injection: literal \\r or \\n embeds fake log lines",
		pattern: /[\r\n]/
	},
	{
		id: "log-url-encoded-crlf",
		description: "URL-encoded CRLF: %0d, %0a, %0D, %0A — decoded by some log parsers",
		pattern: /%0[dDaA]/
	},
	{
		id: "log-unicode-newline",
		description: "Unicode newline variants: U+2028 (line separator), U+2029 (paragraph separator)",
		pattern: /[\u2028\u2029]/
	},
	{
		id: "log-log4shell-jndi",
		description: "Log4Shell: ${jndi:...} triggers remote code execution in Apache Log4j",
		pattern: /\$\{jndi\s*:/i
	},
	{
		id: "log-log4shell-obfuscated",
		description: "Obfuscated Log4Shell: ${::-j}... lookup-bypass prefix used to evade WAF detection",
		pattern: /\$\{::-/
	},
	{
		id: "log-log4j-lookup",
		description: "Log4j lookup syntax: ${env:...}, ${sys:...}, ${ctx:...} — data exfiltration",
		pattern: /\$\{(?:env|sys|ctx|main|map|sd|web|docker|k8s|spring)\s*:/i
	},
	{
		id: "log-ssti-double-brace",
		description: "SSTI double-brace: {{expression}} — Jinja2, Twig, Handlebars, etc.",
		pattern: /\{\{[\s\S]{0,80}\}\}/
	},
	{
		id: "log-ssti-hash-brace",
		description: "SSTI hash-brace: #{expression} — Thymeleaf, Velocity, Ruby ERB",
		pattern: /#\{[\s\S]{0,80}\}/
	},
	{
		id: "log-ssti-dollar-brace",
		description: "SSTI/EL injection: ${expression with operators or method calls} — JSP EL, Freemarker, SpEL",
		pattern: /\$\{[^}]*(?:\.|\(|\*|\+|\bclass\b|\bruntime\b|\bprocess\b|\bexec\b)[^}]{0,80}\}/i
	},
	{
		id: "log-ssti-percent-tag",
		description: "SSTI ERB/ASP tag: <%= expression %> — Ruby ERB, ASP",
		pattern: /<%=[\s\S]{0,80}%>/
	},
	{
		id: "log-null-byte",
		description: "Null byte: \\x00 or %00 — can truncate log entries in C-backed loggers",
		pattern: /\x00|%00/
	},
	{
		id: "log-ansi-escape",
		description: "ANSI escape sequence: ESC[ — can manipulate terminal output when logs are tailed",
		pattern: /\x1b\[/
	}
];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/contexts/sql-strict.js
/**
* SQL-STRICT context patterns.
*
* Extends the base 'SQL' context with three additional rules that are
* effective at detecting real injections but carry a higher false-positive
* risk on general free-text input.
*
* Use 'SQL-STRICT' when:
*   - The string is specifically a SQL fragment or database identifier
*   - You control the input domain (e.g. a dedicated SQL search field)
*   - You can tolerate occasional false positives in exchange for broader coverage
*
* Use 'SQL' (not STRICT) when:
*   - The field is general user text (names, descriptions, comments)
*   - False positives would block legitimate content (e.g. "see note -- above")
*
* Rules moved here from 'SQL' due to false-positive risk:
*
*   sql-line-comment   — "--" fires on "see note -- above", "value--", CSS var(--primary)
*   sql-stacked-query  — "; SELECT" fires on legitimate prose with semicolons + SQL words
*   sql-hex-encoding   — "0xDEAD" fires on hex values in technical docs and log output
*/
const SQL_STRICT_EXTRA = [
	{
		id: "sql-line-comment",
		description: "SQL line comment: -- followed by whitespace or end of string",
		pattern: /--(?:\s|$)/
	},
	{
		id: "sql-stacked-query",
		description: "Stacked queries: semicolon immediately followed by a SQL keyword",
		pattern: /;\s{0,10}(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/i
	},
	{
		id: "sql-hex-encoding",
		description: "Hex-encoded string injection: 0x41414141 style (MySQL)",
		pattern: /\b0x[0-9a-f]{4,}/i
	}
];
const SQL_STRICT_PATTERNS = [...SQL_PATTERNS, ...SQL_STRICT_EXTRA];
//#endregion
//#region ../../../node_modules/.pnpm/is-unsafe@2.0.2/node_modules/is-unsafe/src/index.js
HTML_PATTERNS.label = "HTML";
XML_PATTERNS.label = "XML";
SVG_PATTERNS.label = "SVG";
SQL_PATTERNS.label = "SQL";
SQL_STRICT_PATTERNS.label = "SQL-STRICT";
SHELL_PATTERNS.label = "SHELL";
REDOS_PATTERNS.label = "REDOS";
NOSQL_PATTERNS.label = "NOSQL";
LOG_PATTERNS.label = "LOG";
Object.freeze({
	HTML: HTML_PATTERNS,
	XML: XML_PATTERNS,
	SVG: SVG_PATTERNS,
	SQL: SQL_PATTERNS,
	"SQL-STRICT": SQL_STRICT_PATTERNS,
	SHELL: SHELL_PATTERNS,
	REDOS: REDOS_PATTERNS,
	NOSQL: NOSQL_PATTERNS,
	LOG: LOG_PATTERNS
});
/**
* @typedef {{ id: string, description: string, pattern: RegExp }} Rule
*/
/**
* @typedef {Rule[]} PatternList
*/
/**
* @typedef {Object} MatchResult
* @property {string} context     - Label identifying which context matched ('HTML', 'CUSTOM', etc.)
* @property {string} id          - Rule identifier
* @property {string} description - Human-readable description of what was matched
* @property {RegExp} pattern     - The pattern that matched
*/
/**
* @param {unknown} value
*/
function assertString(value) {
	if (typeof value !== "string") throw new TypeError(`is-unsafe: first argument must be a string, got ${typeof value}`);
}
/**
* @param {unknown} context
*/
function assertContext(context) {
	if (context instanceof RegExp) return;
	if (Array.isArray(context)) {
		if (context.length === 0) throw new TypeError("is-unsafe: context must not be an empty array");
		if (Array.isArray(context[0])) {
			for (const list of context) if (!Array.isArray(list) || list.length === 0) throw new TypeError("is-unsafe: each context in the array must be a non-empty pattern array (PatternList)");
		}
		return;
	}
	throw new TypeError(`is-unsafe: second argument must be a PatternList (e.g. HTML), an array of PatternLists (e.g. [HTML, XML]), or a RegExp. Got: ${typeof context}`);
}
/**
* Normalise any valid context arg into an array of PatternLists.
*
* @param {Rule[]|Rule[][]|RegExp} context
* @returns {{ lists: Rule[][]|null, regex: RegExp|null }}
*/
function normalise(context) {
	if (context instanceof RegExp) return {
		lists: null,
		regex: context
	};
	if (Array.isArray(context[0])) return {
		lists: context,
		regex: null
	};
	return {
		lists: [context],
		regex: null
	};
}
/**
* Test value against a single PatternList. Returns the first MatchResult or null.
*
* @param {string} value
* @param {Rule[]} list
* @returns {MatchResult|null}
*/
function matchList(value, list) {
	const label = list.label ?? "CUSTOM";
	for (const rule of list) if (rule.pattern.test(value)) return {
		context: label,
		id: rule.id,
		description: rule.description,
		pattern: rule.pattern
	};
	return null;
}
/**
* Returns `true` if `value` is unsafe in the given context(s), `false` otherwise.
*
* @param {string} value - The string to test
* @param {PatternList | PatternList[] | RegExp} context
*   - A PatternList imported from is-unsafe (e.g. `HTML`, `XML`)
*   - An array of PatternLists — returns true if unsafe in **any** of them
*   - A custom RegExp — returns true if the pattern matches
* @returns {boolean}
*
* @example
* import { isUnsafe, HTML, SQL } from 'is-unsafe';
*
* isUnsafe('<script>alert(1)<\/script>', HTML)       // true
* isUnsafe('hello world', HTML)                     // false
* isUnsafe('value', [HTML, SQL])                    // false
* isUnsafe('value', /my-pattern/i)                  // false
*/
function isUnsafe(value, context) {
	assertString(value);
	assertContext(context);
	const { lists, regex } = normalise(context);
	if (regex) return regex.test(value);
	for (const list of lists) if (matchList(value, list) !== null) return true;
	return false;
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
/**
* Extract raw attributes (without prefix) from prefixed attribute map
* @param {object} prefixedAttrs - Attributes with prefix from buildAttributesMap
* @param {object} options - Parser options containing attributeNamePrefix
* @returns {object} Raw attributes for matcher
*/
function extractRawAttributes(prefixedAttrs, options) {
	if (!prefixedAttrs) return {};
	const attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
	if (!attrs) return {};
	const rawAttrs = {};
	for (const key in attrs) if (key.startsWith(options.attributeNamePrefix)) {
		const rawName = key.substring(options.attributeNamePrefix.length);
		rawAttrs[rawName] = attrs[key];
	} else rawAttrs[key] = attrs[key];
	return rawAttrs;
}
/**
* Extract namespace from raw tag name
* @param {string} rawTagName - Tag name possibly with namespace (e.g., "soap:Envelope")
* @returns {string|undefined} Namespace or undefined
*/
function extractNamespace(rawTagName) {
	if (!rawTagName || typeof rawTagName !== "string") return void 0;
	const colonIndex = rawTagName.indexOf(":");
	if (colonIndex !== -1 && colonIndex > 0) {
		const ns = rawTagName.substring(0, colonIndex);
		if (ns !== "xmlns") return ns;
	}
}
var OrderedObjParser = class {
	constructor(options, externalEntities) {
		this.options = options;
		this.currentNode = null;
		this.tagsNodeStack = [];
		this.parseXml = parseXml;
		this.parseTextData = parseTextData;
		this.resolveNameSpace = resolveNameSpace;
		this.buildAttributesMap = buildAttributesMap;
		this.isItStopNode = isItStopNode;
		this.replaceEntitiesValue = replaceEntitiesValue;
		this.readStopNodeData = readStopNodeData;
		this.saveTextToParentTag = saveTextToParentTag;
		this.addChild = addChild;
		this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
		this.entityExpansionCount = 0;
		this.currentExpandedLength = 0;
		this.doctypefound = false;
		let namedEntities = { ...XML };
		if (this.options.entityDecoder) this.entityDecoder = this.options.entityDecoder;
		else {
			if (typeof this.options.htmlEntities === "object") namedEntities = this.options.htmlEntities;
			else if (this.options.htmlEntities === true) namedEntities = {
				...COMMON_HTML,
				...CURRENCY
			};
			this.entityDecoder = new EntityDecoder({
				namedEntities: {
					...namedEntities,
					...externalEntities
				},
				numericAllowed: this.options.htmlEntities,
				limit: {
					maxTotalExpansions: this.options.processEntities.maxTotalExpansions,
					maxExpandedLength: this.options.processEntities.maxExpandedLength,
					applyLimitsTo: this.options.processEntities.appliesTo
				},
				onInputEntity: (name, value) => isUnsafe(value, [HTML_PATTERNS, XML_PATTERNS]) ? ENTITY_ACTION.BLOCK : ENTITY_ACTION.ALLOW
			});
		}
		this.matcher = new Matcher();
		this.readonlyMatcher = this.matcher.readOnly();
		this.isCurrentNodeStopNode = false;
		this.stopNodeExpressionsSet = new ExpressionSet();
		const stopNodesOpts = this.options.stopNodes;
		if (stopNodesOpts && stopNodesOpts.length > 0) {
			for (let i = 0; i < stopNodesOpts.length; i++) {
				const stopNodeExp = stopNodesOpts[i];
				if (typeof stopNodeExp === "string") this.stopNodeExpressionsSet.add(new Expression(stopNodeExp));
				else if (stopNodeExp instanceof Expression) this.stopNodeExpressionsSet.add(stopNodeExp);
			}
			this.stopNodeExpressionsSet.seal();
		}
	}
};
/**
* @param {string} val
* @param {string} tagName
* @param {string|Matcher} jPath - jPath string or Matcher instance based on options.jPath
* @param {boolean} dontTrim
* @param {boolean} hasAttributes
* @param {boolean} isLeafNode
* @param {boolean} escapeEntities
*/
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
	const options = this.options;
	if (val !== void 0) {
		if (options.trimValues && !dontTrim) val = val.trim();
		if (val.length > 0) {
			if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
			const jPathOrMatcher = options.jPath ? jPath.toString() : jPath;
			const newval = options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
			if (newval === null || newval === void 0) return val;
			else if (typeof newval !== typeof val || newval !== val) return newval;
			else if (options.trimValues) return parseValue(val, options.parseTagValue, options.numberParseOptions);
			else if (val.trim() === val) return parseValue(val, options.parseTagValue, options.numberParseOptions);
			else return val;
		}
	}
}
function resolveNameSpace(tagname) {
	if (this.options.removeNSPrefix) {
		const tags = tagname.split(":");
		const prefix = tagname.charAt(0) === "/" ? "/" : "";
		if (tags[0] === "xmlns") return "";
		if (tags.length === 2) tagname = prefix + tags[1];
	}
	return tagname;
}
const attrsRegx = /* @__PURE__ */ new RegExp("([^\\s=]+)\\s*(=\\s*(['\"])([\\s\\S]*?)\\3)?", "gm");
function buildAttributesMap(attrStr, jPath, tagName, force = false) {
	const options = this.options;
	if (force === true || options.ignoreAttributes !== true && typeof attrStr === "string") {
		const matches = getAllMatches(attrStr, attrsRegx);
		const len = matches.length;
		const attrs = {};
		const processedVals = new Array(len);
		let hasRawAttrs = false;
		const rawAttrsForMatcher = {};
		for (let i = 0; i < len; i++) {
			const attrName = this.resolveNameSpace(matches[i][1]);
			const oldVal = matches[i][4];
			if (attrName.length && oldVal !== void 0) {
				let val = oldVal;
				if (options.trimValues) val = val.trim();
				val = this.replaceEntitiesValue(val, tagName, this.readonlyMatcher);
				processedVals[i] = val;
				rawAttrsForMatcher[attrName] = val;
				hasRawAttrs = true;
			}
		}
		if (hasRawAttrs && typeof jPath === "object" && jPath.updateCurrent) jPath.updateCurrent(rawAttrsForMatcher);
		const jPathStr = options.jPath ? jPath.toString() : this.readonlyMatcher;
		let hasAttrs = false;
		for (let i = 0; i < len; i++) {
			const attrName = this.resolveNameSpace(matches[i][1]);
			if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
			let aName = options.attributeNamePrefix + attrName;
			if (attrName.length) {
				if (options.transformAttributeName) aName = options.transformAttributeName(aName);
				aName = sanitizeName(aName, options);
				if (matches[i][4] !== void 0) {
					const oldVal = processedVals[i];
					const newVal = options.attributeValueProcessor(attrName, oldVal, jPathStr);
					if (newVal === null || newVal === void 0) attrs[aName] = oldVal;
					else if (typeof newVal !== typeof oldVal || newVal !== oldVal) attrs[aName] = newVal;
					else attrs[aName] = parseValue(oldVal, options.parseAttributeValue, options.numberParseOptions);
					hasAttrs = true;
				} else if (options.allowBooleanAttributes) {
					attrs[aName] = true;
					hasAttrs = true;
				}
			}
		}
		if (!hasAttrs) return;
		if (options.attributesGroupName && !options.preserveOrder) {
			const attrCollection = {};
			attrCollection[options.attributesGroupName] = attrs;
			return attrCollection;
		}
		return attrs;
	}
}
const parseXml = function(xmlData) {
	xmlData = xmlData.replace(/\r\n?/g, "\n");
	const xmlObj = new XmlNode("!xml");
	let currentNode = xmlObj;
	let textData = "";
	this.matcher.reset();
	this.entityDecoder.reset();
	this.entityExpansionCount = 0;
	this.currentExpandedLength = 0;
	this.doctypefound = false;
	const options = this.options;
	const docTypeReader = new DocTypeReader(options.processEntities);
	const xmlLen = xmlData.length;
	for (let i = 0; i < xmlLen; i++) if (xmlData[i] === "<") {
		const c1 = xmlData.charCodeAt(i + 1);
		if (c1 === 47) {
			const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
			let tagName = xmlData.substring(i + 2, closeIndex).trim();
			if (options.removeNSPrefix) {
				const colonIndex = tagName.indexOf(":");
				if (colonIndex !== -1) tagName = tagName.substr(colonIndex + 1);
			}
			tagName = transformTagName(options.transformTagName, tagName, "", options).tagName;
			if (currentNode) textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
			const lastTagName = this.matcher.getCurrentTag();
			if (tagName && options.unpairedTagsSet.has(tagName)) throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
			if (lastTagName && options.unpairedTagsSet.has(lastTagName)) {
				this.matcher.pop();
				this.tagsNodeStack.pop();
			}
			this.matcher.pop();
			this.isCurrentNodeStopNode = false;
			currentNode = this.tagsNodeStack.pop() || xmlObj;
			if (options.captureMetaData && currentNode) currentNode.addEndIndex(closeIndex + 1);
			textData = "";
			i = closeIndex;
		} else if (c1 === 63) {
			let tagData = readTagExp(xmlData, i, false, "?>");
			if (!tagData) throw new Error("Pi Tag is not closed.");
			textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
			const attsMap = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName, true);
			if (attsMap) {
				const ver = attsMap[this.options.attributeNamePrefix + "version"];
				this.entityDecoder.setXmlVersion(Number(ver) || 1);
				docTypeReader.setXmlVersion(Number(ver) || 1);
			}
			if (options.ignoreDeclaration && tagData.tagName === "?xml" || options.ignorePiTags) {} else {
				const childNode = new XmlNode(tagData.tagName);
				childNode.add(options.textNodeName, "");
				if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent && options.ignoreAttributes !== true) childNode[":@"] = attsMap;
				this.addChild(currentNode, childNode, this.readonlyMatcher, i);
				if (options.captureMetaData) currentNode.addEndIndex(tagData.closeIndex + 2);
			}
			i = tagData.closeIndex + 1;
		} else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
			const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
			if (options.commentPropName) {
				const comment = xmlData.substring(i + 4, endIndex - 2);
				textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
				currentNode.add(options.commentPropName, [{ [options.textNodeName]: comment }]);
			}
			i = endIndex;
		} else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 68) {
			if (this.doctypefound) throw new Error("Multiple DOCTYPE declarations found.");
			this.doctypefound = true;
			const result = docTypeReader.readDocType(xmlData, i);
			this.entityDecoder.addInputEntities(result.entities);
			i = result.i;
		} else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
			const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
			const tagExp = xmlData.substring(i + 9, closeIndex);
			textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
			let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
			if (val == void 0) val = "";
			if (options.cdataPropName) currentNode.add(options.cdataPropName, [{ [options.textNodeName]: tagExp }]);
			else currentNode.add(options.textNodeName, val);
			i = closeIndex + 2;
		} else {
			let result = readTagExp(xmlData, i, options.removeNSPrefix);
			if (!result) {
				const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlLen, i + 50));
				throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
			}
			let tagName = result.tagName;
			const rawTagName = result.rawTagName;
			let tagExp = result.tagExp;
			let attrExpPresent = result.attrExpPresent;
			let closeIndex = result.closeIndex;
			({tagName, tagExp} = transformTagName(options.transformTagName, tagName, tagExp, options));
			if (options.strictReservedNames && (tagName === options.commentPropName || tagName === options.cdataPropName || tagName === options.textNodeName || tagName === options.attributesGroupName)) throw new Error(`Invalid tag name: ${tagName}`);
			if (currentNode && textData) {
				if (currentNode.tagname !== "!xml") textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
			}
			const lastTag = currentNode;
			if (lastTag && options.unpairedTagsSet.has(lastTag.tagname)) {
				currentNode = this.tagsNodeStack.pop();
				this.matcher.pop();
			}
			let isSelfClosing = false;
			if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
				isSelfClosing = true;
				if (tagName[tagName.length - 1] === "/") {
					tagName = tagName.substr(0, tagName.length - 1);
					tagExp = tagName;
				} else tagExp = tagExp.substr(0, tagExp.length - 1);
				attrExpPresent = tagName !== tagExp;
			}
			let prefixedAttrs = null;
			let namespace = void 0;
			namespace = extractNamespace(rawTagName);
			if (tagName !== xmlObj.tagname) this.matcher.push(tagName, {}, namespace);
			if (tagName !== tagExp && attrExpPresent) {
				prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
				if (prefixedAttrs) extractRawAttributes(prefixedAttrs, options);
			}
			if (tagName !== xmlObj.tagname) this.isCurrentNodeStopNode = this.isItStopNode();
			const startIndex = i;
			if (this.isCurrentNodeStopNode) {
				let tagContent = "";
				if (isSelfClosing) i = result.closeIndex;
				else if (options.unpairedTagsSet.has(tagName)) i = result.closeIndex;
				else {
					const result = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
					if (!result) throw new Error(`Unexpected end of ${rawTagName}`);
					i = result.i;
					tagContent = result.tagContent;
				}
				const childNode = new XmlNode(tagName);
				if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
				childNode.add(options.textNodeName, tagContent);
				this.matcher.pop();
				this.isCurrentNodeStopNode = false;
				this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
				if (options.captureMetaData) currentNode.addEndIndex(i + 1);
			} else {
				if (isSelfClosing) {
					({tagName, tagExp} = transformTagName(options.transformTagName, tagName, tagExp, options));
					const childNode = new XmlNode(tagName);
					if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
					this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
					if (options.captureMetaData) currentNode.addEndIndex(closeIndex + 1);
					this.matcher.pop();
					this.isCurrentNodeStopNode = false;
				} else if (options.unpairedTagsSet.has(tagName)) {
					const childNode = new XmlNode(tagName);
					if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
					this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
					if (options.captureMetaData) currentNode.addEndIndex(result.closeIndex + 1);
					this.matcher.pop();
					this.isCurrentNodeStopNode = false;
					i = result.closeIndex;
					continue;
				} else {
					const childNode = new XmlNode(tagName);
					if (this.tagsNodeStack.length > options.maxNestedTags) throw new Error("Maximum nested tags exceeded");
					this.tagsNodeStack.push(currentNode);
					if (prefixedAttrs) childNode[":@"] = prefixedAttrs;
					this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
					currentNode = childNode;
				}
				textData = "";
				i = closeIndex;
			}
		}
	} else textData += xmlData[i];
	return xmlObj.child;
};
function addChild(currentNode, childNode, matcher, startIndex) {
	if (!this.options.captureMetaData) startIndex = void 0;
	const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
	const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
	if (result === false) {} else if (typeof result === "string") {
		childNode.tagname = result;
		currentNode.addChild(childNode, startIndex);
	} else currentNode.addChild(childNode, startIndex);
}
/**
* @param {object} val - Entity object with regex and val properties
* @param {string} tagName - Tag name
* @param {string|Matcher} jPath - jPath string or Matcher instance based on options.jPath
*/
function replaceEntitiesValue(val, tagName, jPath) {
	const entityConfig = this.options.processEntities;
	if (!entityConfig || !entityConfig.enabled) return val;
	if (entityConfig.allowedTags) {
		const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
		if (!(Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher))) return val;
	}
	if (entityConfig.tagFilter) {
		const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
		if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) return val;
	}
	return this.entityDecoder.decode(val);
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
	if (textData) {
		if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
		textData = this.parseTextData(textData, parentNode.tagname, matcher, false, parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false, isLeafNode);
		if (textData !== void 0 && textData !== "") parentNode.add(this.options.textNodeName, textData);
		textData = "";
	}
	return textData;
}
/**
* @param {Array<Expression>} stopNodeExpressions - Array of compiled Expression objects
* @param {Matcher} matcher - Current path matcher
*/
function isItStopNode() {
	if (this.stopNodeExpressionsSet.size === 0) return false;
	return this.matcher.matchesAny(this.stopNodeExpressionsSet);
}
/**
* Returns the tag Expression and where it is ending handling single-double quotes situation
* @param {string} xmlData 
* @param {number} i starting index
* @returns 
*/
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
	let attrBoundary = 0;
	const len = xmlData.length;
	const closeCode0 = closingChar.charCodeAt(0);
	const closeCode1 = closingChar.length > 1 ? closingChar.charCodeAt(1) : -1;
	let result = "";
	let segmentStart = i;
	for (let index = i; index < len; index++) {
		const code = xmlData.charCodeAt(index);
		if (attrBoundary) {
			if (code === attrBoundary) attrBoundary = 0;
		} else if (code === 34 || code === 39) attrBoundary = code;
		else if (code === closeCode0) if (closeCode1 !== -1) {
			if (xmlData.charCodeAt(index + 1) === closeCode1) {
				result += xmlData.substring(segmentStart, index);
				return {
					data: result,
					index
				};
			}
		} else {
			result += xmlData.substring(segmentStart, index);
			return {
				data: result,
				index
			};
		}
		else if (code === 9 && !attrBoundary) {
			result += xmlData.substring(segmentStart, index) + " ";
			segmentStart = index + 1;
		}
	}
}
function findClosingIndex(xmlData, str, i, errMsg) {
	const closingIndex = xmlData.indexOf(str, i);
	if (closingIndex === -1) throw new Error(errMsg);
	else return closingIndex + str.length - 1;
}
function findClosingChar(xmlData, char, i, errMsg) {
	const closingIndex = xmlData.indexOf(char, i);
	if (closingIndex === -1) throw new Error(errMsg);
	return closingIndex;
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
	const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
	if (!result) return;
	let tagExp = result.data;
	const closeIndex = result.index;
	const separatorIndex = tagExp.search(/\s/);
	let tagName = tagExp;
	let attrExpPresent = true;
	if (separatorIndex !== -1) {
		tagName = tagExp.substring(0, separatorIndex);
		tagExp = tagExp.substring(separatorIndex + 1).trimStart();
	}
	const rawTagName = tagName;
	if (removeNSPrefix) {
		const colonIndex = tagName.indexOf(":");
		if (colonIndex !== -1) {
			tagName = tagName.substr(colonIndex + 1);
			attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
		}
	}
	return {
		tagName,
		tagExp,
		closeIndex,
		attrExpPresent,
		rawTagName
	};
}
/**
* find paired tag for a stop node
* @param {string} xmlData 
* @param {string} tagName 
* @param {number} i 
*/
function readStopNodeData(xmlData, tagName, i) {
	const startIndex = i;
	let openTagCount = 1;
	const xmllen = xmlData.length;
	for (; i < xmllen; i++) if (xmlData[i] === "<") {
		const c1 = xmlData.charCodeAt(i + 1);
		if (c1 === 47) {
			const closeIndex = findClosingChar(xmlData, ">", i, `${tagName} is not closed`);
			if (xmlData.substring(i + 2, closeIndex).trim() === tagName) {
				openTagCount--;
				if (openTagCount === 0) return {
					tagContent: xmlData.substring(startIndex, i),
					i: closeIndex
				};
			}
			i = closeIndex;
		} else if (c1 === 63) i = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
		else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) i = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
		else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) i = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
		else {
			const tagData = readTagExp(xmlData, i, false);
			if (tagData) {
				if ((tagData && tagData.tagName) === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") openTagCount++;
				i = tagData.closeIndex;
			}
		}
	}
}
function parseValue(val, shouldParse, options) {
	if (shouldParse && typeof val === "string") {
		const newval = val.trim();
		if (newval === "true") return true;
		else if (newval === "false") return false;
		else return toNumber(val, options);
	} else if (isExist(val)) return val;
	else return "";
}
function transformTagName(fn, tagName, tagExp, options) {
	if (fn) {
		const newTagName = fn(tagName);
		if (tagExp === tagName) tagExp = newTagName;
		tagName = newTagName;
	}
	tagName = sanitizeName(tagName, options);
	return {
		tagName,
		tagExp
	};
}
function sanitizeName(name, options) {
	if (criticalProperties.includes(name)) throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
	else if (DANGEROUS_PROPERTY_NAMES.includes(name)) return options.onDangerousProperty(name);
	return name;
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/node2json.js
const METADATA_SYMBOL = XmlNode.getMetaDataSymbol();
/**
* Helper function to strip attribute prefix from attribute map
* @param {object} attrs - Attributes with prefix (e.g., {"@_class": "code"})
* @param {string} prefix - Attribute prefix to remove (e.g., "@_")
* @returns {object} Attributes without prefix (e.g., {"class": "code"})
*/
function stripAttributePrefix(attrs, prefix) {
	if (!attrs || typeof attrs !== "object") return {};
	if (!prefix) return attrs;
	const rawAttrs = {};
	for (const key in attrs) if (key.startsWith(prefix)) {
		const rawName = key.substring(prefix.length);
		rawAttrs[rawName] = attrs[key];
	} else rawAttrs[key] = attrs[key];
	return rawAttrs;
}
/**
* 
* @param {array} node 
* @param {any} options 
* @param {Matcher} matcher - Path matcher instance
* @returns 
*/
function prettify(node, options, matcher, readonlyMatcher) {
	return compress(node, options, matcher, readonlyMatcher);
}
/**
* @param {array} arr 
* @param {object} options 
* @param {Matcher} matcher - Path matcher instance
* @returns object
*/
function compress(arr, options, matcher, readonlyMatcher) {
	let text;
	const compressedObj = {};
	for (let i = 0; i < arr.length; i++) {
		const tagObj = arr[i];
		const property = propName(tagObj);
		if (property !== void 0 && property !== options.textNodeName) {
			const rawAttrs = stripAttributePrefix(tagObj[":@"] || {}, options.attributeNamePrefix);
			matcher.push(property, rawAttrs);
		}
		if (property === options.textNodeName) if (text === void 0) text = tagObj[property];
		else text += "" + tagObj[property];
		else if (property === void 0) continue;
		else if (tagObj[property]) {
			let val = compress(tagObj[property], options, matcher, readonlyMatcher);
			const isLeaf = isLeafTag(val, options);
			if (Object.keys(val).length === 0 && options.alwaysCreateTextNode) val[options.textNodeName] = "";
			if (tagObj[":@"]) assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
			else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) val = val[options.textNodeName];
			else if (Object.keys(val).length === 0) if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
			else val = "";
			if (tagObj[METADATA_SYMBOL] !== void 0 && typeof val === "object" && val !== null) val[METADATA_SYMBOL] = tagObj[METADATA_SYMBOL];
			if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
				if (!Array.isArray(compressedObj[property])) compressedObj[property] = [compressedObj[property]];
				compressedObj[property].push(val);
			} else {
				const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
				if (options.isArray(property, jPathOrMatcher, isLeaf)) compressedObj[property] = [val];
				else compressedObj[property] = val;
			}
			if (property !== void 0 && property !== options.textNodeName) matcher.pop();
		}
	}
	if (typeof text === "string") {
		if (text.length > 0) compressedObj[options.textNodeName] = text;
	} else if (text !== void 0) compressedObj[options.textNodeName] = text;
	return compressedObj;
}
function propName(obj) {
	const keys = Object.keys(obj);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (key !== ":@") return key;
	}
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
	if (attrMap) {
		const keys = Object.keys(attrMap);
		const len = keys.length;
		for (let i = 0; i < len; i++) {
			const atrrName = keys[i];
			const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
			const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
			if (options.isArray(atrrName, jPathOrMatcher, true, true)) obj[atrrName] = [attrMap[atrrName]];
			else obj[atrrName] = attrMap[atrrName];
		}
	}
}
function isLeafTag(obj, options) {
	const { textNodeName } = options;
	const propCount = Object.keys(obj).length;
	if (propCount === 0) return true;
	if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) return true;
	return false;
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/validator.js
const defaultOptions$2 = {
	allowBooleanAttributes: false,
	unpairedTags: []
};
function validate(xmlData, options) {
	options = Object.assign({}, defaultOptions$2, options);
	const tags = [];
	let tagFound = false;
	let reachedRoot = false;
	if (xmlData[0] === "﻿") xmlData = xmlData.substr(1);
	for (let i = 0; i < xmlData.length; i++) if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
		i += 2;
		i = readPI(xmlData, i);
		if (i.err) return i;
	} else if (xmlData[i] === "<") {
		let tagStartPos = i;
		i++;
		if (xmlData[i] === "!") {
			i = readCommentAndCDATA(xmlData, i);
			continue;
		} else {
			let closingTag = false;
			if (xmlData[i] === "/") {
				closingTag = true;
				i++;
			}
			let tagName = "";
			for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) tagName += xmlData[i];
			tagName = tagName.trim();
			if (tagName[tagName.length - 1] === "/") {
				tagName = tagName.substring(0, tagName.length - 1);
				i--;
			}
			if (!validateTagName(tagName)) {
				let msg;
				if (tagName.trim().length === 0) msg = "Invalid space after '<'.";
				else msg = "Tag '" + tagName + "' is an invalid name.";
				return getErrorObject("InvalidTag", msg, getLineNumberForPosition$1(xmlData, i));
			}
			const result = readAttributeStr(xmlData, i);
			if (result === false) return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition$1(xmlData, i));
			let attrStr = result.value;
			i = result.index;
			if (attrStr[attrStr.length - 1] === "/") {
				const attrStrStart = i - attrStr.length;
				attrStr = attrStr.substring(0, attrStr.length - 1);
				const isValid = validateAttributeString(attrStr, options);
				if (isValid === true) tagFound = true;
				else return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition$1(xmlData, attrStrStart + isValid.err.line));
			} else if (closingTag) if (!result.tagClosed) return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition$1(xmlData, i));
			else if (attrStr.trim().length > 0) return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition$1(xmlData, tagStartPos));
			else if (tags.length === 0) return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition$1(xmlData, tagStartPos));
			else {
				const otg = tags.pop();
				if (tagName !== otg.tagName) {
					let openPos = getLineNumberForPosition$1(xmlData, otg.tagStartPos);
					return getErrorObject("InvalidTag", "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.", getLineNumberForPosition$1(xmlData, tagStartPos));
				}
				if (tags.length == 0) reachedRoot = true;
			}
			else {
				const isValid = validateAttributeString(attrStr, options);
				if (isValid !== true) return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition$1(xmlData, i - attrStr.length + isValid.err.line));
				if (reachedRoot === true) return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition$1(xmlData, i));
				else if (options.unpairedTags.indexOf(tagName) !== -1) {} else tags.push({
					tagName,
					tagStartPos
				});
				tagFound = true;
			}
			for (i++; i < xmlData.length; i++) if (xmlData[i] === "<") if (xmlData[i + 1] === "!") {
				i++;
				i = readCommentAndCDATA(xmlData, i);
				continue;
			} else if (xmlData[i + 1] === "?") {
				i = readPI(xmlData, ++i);
				if (i.err) return i;
			} else break;
			else if (xmlData[i] === "&") {
				const afterAmp = validateAmpersand(xmlData, i);
				if (afterAmp == -1) return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition$1(xmlData, i));
				i = afterAmp;
			} else if (reachedRoot === true && !isWhiteSpace$1(xmlData[i])) return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition$1(xmlData, i));
			if (xmlData[i] === "<") i--;
		}
	} else {
		if (isWhiteSpace$1(xmlData[i])) continue;
		return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition$1(xmlData, i));
	}
	if (!tagFound) return getErrorObject("InvalidXml", "Start tag expected.", 1);
	else if (tags.length == 1) return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition$1(xmlData, tags[0].tagStartPos));
	else if (tags.length > 0) return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", {
		line: 1,
		col: 1
	});
	return true;
}
function isWhiteSpace$1(char) {
	return char === " " || char === "	" || char === "\n" || char === "\r";
}
/**
* Read Processing insstructions and skip
* @param {*} xmlData
* @param {*} i
*/
function readPI(xmlData, i) {
	const start = i;
	for (; i < xmlData.length; i++) if (xmlData[i] == "?" || xmlData[i] == " ") {
		const tagname = xmlData.substr(start, i - start);
		if (i > 5 && tagname === "xml") return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition$1(xmlData, i));
		else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
			i++;
			break;
		} else continue;
	}
	return i;
}
function readCommentAndCDATA(xmlData, i) {
	if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
		for (i += 3; i < xmlData.length; i++) if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
			i += 2;
			break;
		}
	} else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
		let angleBracketsCount = 1;
		for (i += 8; i < xmlData.length; i++) if (xmlData[i] === "<") angleBracketsCount++;
		else if (xmlData[i] === ">") {
			angleBracketsCount--;
			if (angleBracketsCount === 0) break;
		}
	} else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
		for (i += 8; i < xmlData.length; i++) if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
			i += 2;
			break;
		}
	}
	return i;
}
const doubleQuote = "\"";
const singleQuote = "'";
/**
* Keep reading xmlData until '<' is found outside the attribute value.
* @param {string} xmlData
* @param {number} i
*/
function readAttributeStr(xmlData, i) {
	let attrStr = "";
	let startChar = "";
	let tagClosed = false;
	for (; i < xmlData.length; i++) {
		if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) if (startChar === "") startChar = xmlData[i];
		else if (startChar !== xmlData[i]) {} else startChar = "";
		else if (xmlData[i] === ">") {
			if (startChar === "") {
				tagClosed = true;
				break;
			}
		}
		attrStr += xmlData[i];
	}
	if (startChar !== "") return false;
	return {
		value: attrStr,
		index: i,
		tagClosed
	};
}
/**
* Walk `attrStr` once, left to right, splitting it into attribute tokens.
*
* This replaces a regex that used to do the same job
* (`(\s*)([^\s=]+)(\s*=)?(\s*(['"])(([\s\S])*?)\5)?`). That regex led with an
* optional whitespace group followed by a required "non-whitespace" group.
* On a long run of whitespace that never resolves into an attribute name
* (e.g. a tag with thousands of trailing spaces before `>`), the engine
* backtracks the whitespace group one character at a time before giving up
* and moving to the next starting position — one full backtrack per
* position, which is quadratic in the length of the run.
*
* A single forward-only scan can never backtrack, so it can't be made slow
* this way no matter how much whitespace the input contains — it's always
* proportional to the length of the string, once.
*
* Each returned token mirrors the shape the old regex match array had, so
* the validation logic below (which reads token[1]..token[6]) didn't need
* to change:
*   token.startIndex - where this token begins in attrStr
*   token[1]          - leading whitespace before the name
*   token[2]          - the attribute name
*   token[3]          - whitespace + '=' if present, else undefined
*   token[4]          - marker (any defined value) if a quoted value was found
*   token[5]          - the quote character used ('"' or "'")
*   token[6]          - the value's text, without the surrounding quotes
*
* A malformed leading character (e.g. a stray '=' with no name before it)
* is simply skipped over, one character at a time — the same outcome the
* old regex produced by failing to match at that position and retrying at
* the next one.
*/
function scanAttributeTokens$1(attrStr) {
	const tokens = [];
	const len = attrStr.length;
	let i = 0;
	while (i < len) {
		const tokenStart = i;
		while (i < len && isWhiteSpace$1(attrStr[i])) i++;
		if (i >= len) break;
		if (attrStr[i] === "=") {
			i = tokenStart + 1;
			continue;
		}
		const leadingWs = attrStr.slice(tokenStart, i);
		const nameStart = i;
		while (i < len && !isWhiteSpace$1(attrStr[i]) && attrStr[i] !== "=") i++;
		const name = attrStr.slice(nameStart, i);
		let equalsGroup;
		let j = i;
		while (j < len && isWhiteSpace$1(attrStr[j])) j++;
		if (j < len && attrStr[j] === "=") {
			equalsGroup = attrStr.slice(i, j + 1);
			i = j + 1;
		}
		let quoteChar;
		let value;
		let k = i;
		while (k < len && isWhiteSpace$1(attrStr[k])) k++;
		if (k < len && (attrStr[k] === "\"" || attrStr[k] === "'")) {
			const valueStart = k + 1;
			const closeIdx = attrStr.indexOf(attrStr[k], valueStart);
			if (closeIdx !== -1) {
				quoteChar = attrStr[k];
				value = attrStr.slice(valueStart, closeIdx);
				i = closeIdx + 1;
			}
		}
		const token = { startIndex: tokenStart };
		token[1] = leadingWs;
		token[2] = name;
		token[3] = equalsGroup;
		token[4] = quoteChar !== void 0 ? true : void 0;
		token[5] = quoteChar;
		token[6] = value;
		tokens.push(token);
	}
	return tokens;
}
function validateAttributeString(attrStr, options) {
	const matches = scanAttributeTokens$1(attrStr);
	const attrNames = {};
	for (let i = 0; i < matches.length; i++) {
		if (matches[i][1].length === 0) return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch$1(matches[i]));
		else if (matches[i][3] !== void 0 && matches[i][4] === void 0) return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch$1(matches[i]));
		else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch$1(matches[i]));
		const attrName = matches[i][2];
		if (!validateAttrName(attrName)) return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch$1(matches[i]));
		if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) attrNames[attrName] = 1;
		else return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch$1(matches[i]));
	}
	return true;
}
function validateNumberAmpersand(xmlData, i) {
	let re = /\d/;
	if (xmlData[i] === "x") {
		i++;
		re = /[\da-fA-F]/;
	}
	for (; i < xmlData.length; i++) {
		if (xmlData[i] === ";") return i;
		if (!xmlData[i].match(re)) break;
	}
	return -1;
}
function validateAmpersand(xmlData, i) {
	i++;
	if (xmlData[i] === ";") return -1;
	if (xmlData[i] === "#") {
		i++;
		return validateNumberAmpersand(xmlData, i);
	}
	let count = 0;
	for (; i < xmlData.length; i++, count++) {
		if (xmlData[i].match(/\w/) && count < 20) continue;
		if (xmlData[i] === ";") break;
		return -1;
	}
	return i;
}
function getErrorObject(code, message, lineNumber) {
	return { err: {
		code,
		msg: message,
		line: lineNumber.line || lineNumber,
		col: lineNumber.col
	} };
}
function validateAttrName(attrName) {
	return isName(attrName);
}
function validateTagName(tagname) {
	return isName(tagname);
}
function getLineNumberForPosition$1(xmlData, index) {
	const lines = xmlData.substring(0, index).split(/\r?\n/);
	return {
		line: lines.length,
		col: lines[lines.length - 1].length + 1
	};
}
function getPositionFromMatch$1(match) {
	return match.startIndex + match[1].length;
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-parser@5.11.1/node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
	constructor(options) {
		this.externalEntities = {};
		this.options = buildOptions(options);
	}
	/**
	* Parse XML dats to JS object 
	* @param {string|Uint8Array} xmlData 
	* @param {boolean|Object} validationOption 
	*/
	parse(xmlData, validationOption) {
		if (typeof xmlData !== "string" && xmlData.toString) xmlData = xmlData.toString();
		else if (typeof xmlData !== "string") throw new Error("XML data is accepted in String or Bytes[] form.");
		if (validationOption) {
			if (validationOption === true) validationOption = {};
			const result = validate(xmlData, validationOption);
			if (result !== true) throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
		}
		const orderedObjParser = new OrderedObjParser(this.options, this.externalEntities);
		const orderedResult = orderedObjParser.parseXml(xmlData);
		if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
		else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
	}
	/**
	* Add Entity which is not by default supported by this library
	* @param {string} key 
	* @param {string} value 
	*/
	addEntity(key, value) {
		if (value.indexOf("&") !== -1) throw new Error("Entity value can't have '&'");
		else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
		else if (value === "&") throw new Error("An entity with value '&' is not permitted");
		else this.externalEntities[key] = value;
	}
	/**
	* Returns a Symbol that can be used to access the metadata
	* property on a node.
	* 
	* If Symbol is not available in the environment, an ordinary property is used
	* and the name of the property is here returned.
	* 
	* The XMLMetaData property is only present when `captureMetaData`
	* is true in the options.
	*/
	static getMetaDataSymbol() {
		return XmlNode.getMetaDataSymbol();
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/ValidationError.js
var ValidationError = class extends Error {
	constructor(message, code, line, col) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.line = line;
		this.col = col;
		Error.captureStackTrace?.(this, this.constructor);
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/util.js
function isWhiteSpace(char) {
	return char === " " || char === "	" || char === "\n" || char === "\r";
}
/**
* True for character codes that are illegal as literal characters anywhere in
* an XML document (element text, attribute values, comments): 0x00-0x08,
* 0x0B, 0x0C, 0x0E-0x1F. Tab/LF/CR (0x09/0x0A/0x0D) are legal whitespace and
* are excluded.
*/
function isIllegalControlCode(code) {
	return code <= 8 || code === 11 || code === 12 || code >= 14 && code <= 31;
}
function getLineNumberForPosition(xmlData, index) {
	const lines = xmlData.substring(0, index).split(/\r?\n/);
	return {
		line: lines.length,
		col: lines[lines.length - 1].length + 1
	};
}
function getPositionFromMatch(match) {
	return match.startIndex + match[1].length;
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/XmlNameValidator.js
/**
* XmlNameValidator — single responsibility: expose XML Name / QName
* validators for a given xmlVersion, memoized per instance since element
* and attribute names repeat heavily across a document.
*/
var XmlNameValidator = class {
	constructor(xmlVersion = "1.0") {
		this.xmlVersion = xmlVersion;
		this.qName = createValidator("qName", { xmlVersion });
		this.name = createValidator("name", { xmlVersion });
	}
	isValidQName(value) {
		return this.qName(value);
	}
	isValidName(value) {
		return this.name(value);
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/XmlDeclarationValidator.js
function isWordChar(ch) {
	return ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch >= "0" && ch <= "9" || ch === "_";
}
/**
* Walk the `<?xml ... ?>` body once, left to right, pulling out
* `name="value"` / `name='value'` pairs (each one preceded by required
* whitespace) and collecting everything else as leftover text.
*
* This replaces two regexes that used to do the same job:
*   /\s+([\w]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g          - to find attributes
*   /\s+[\w]+\s*=\s*(?:"[^"]*"|'[^']*')/g (via replace)  - to find leftovers
*
* Both led with a required-but-greedy `\s+`. On a long run of whitespace
* that's never followed by a valid `name=value`, the engine backtracks that
* whitespace group one character at a time before giving up on that
* starting position — and since none of those backtracked attempts can ever
* succeed (a whitespace character is never a valid name character, at any
* backtrack length), all of that retrying was wasted work. A `<?xml ?>`
* declaration padded with thousands of spaces could make this step take
* seconds. Scanning forward once, without ever revisiting a position, is
* both faster and gives the identical result — the retried attempts could
* never have succeeded anyway.
*
* @param {string} declBody
* @returns {{ matches: Array<{name: string, value: string, index: number}>, leftover: string }}
*/
function scanDeclAttributes(declBody) {
	const matches = [];
	let leftover = "";
	const len = declBody.length;
	let i = 0;
	while (i < len) {
		if (!isWhiteSpace(declBody[i])) {
			leftover += declBody[i];
			i++;
			continue;
		}
		const matchStart = i;
		let p = i;
		while (p < len && isWhiteSpace(declBody[p])) p++;
		const nameStart = p;
		while (p < len && isWordChar(declBody[p])) p++;
		if (p === nameStart) {
			leftover += declBody.slice(matchStart, p + 1 <= len ? p : len);
			i = p > matchStart ? p : matchStart + 1;
			continue;
		}
		const name = declBody.slice(nameStart, p);
		let q = p;
		while (q < len && isWhiteSpace(declBody[q])) q++;
		if (declBody[q] !== "=") {
			leftover += declBody.slice(matchStart, p);
			i = p;
			continue;
		}
		q++;
		while (q < len && isWhiteSpace(declBody[q])) q++;
		const quote = declBody[q];
		if (quote !== "\"" && quote !== "'") {
			leftover += declBody.slice(matchStart, p);
			i = p;
			continue;
		}
		const valueStart = q + 1;
		const closeIdx = declBody.indexOf(quote, valueStart);
		if (closeIdx === -1) {
			leftover += declBody.slice(matchStart, p);
			i = p;
			continue;
		}
		matches.push({
			name,
			value: declBody.slice(valueStart, closeIdx),
			index: matchStart
		});
		i = closeIdx + 1;
	}
	return {
		matches,
		leftover
	};
}
/**
* XmlDeclarationValidator — single responsibility: parse and validate the
* `<?xml version="..." encoding="..." standalone="..."?>` prolog.
*
* Behaviour is controlled by the `xmlDeclaraion` config block:
*
*   xmlDeclaraion: {
*     optional: true,     // when false, the document MUST start with a decl
*     argPosition: true,  // when true, version/encoding/standalone must
*                          // appear in that fixed order (spec-mandated);
*                          // set false to allow any order.
*   }
*
* (`argPostion` — the spelling used in the original design note — is also
* accepted as an alias for `argPosition`.)
*/
var XmlDeclarationValidator = class {
	constructor(options = {}, throwError) {
		this.optional = options.optional !== void 0 ? options.optional : true;
		this.argPosition = options.argPosition !== void 0 ? options.argPosition : options.argPostion !== void 0 ? options.argPostion : true;
		this._throwError = throwError;
	}
	/**
	* @param {string} xmlData - full document (BOM already stripped)
	* @returns {{ version: string, end: number }} version defaults to '1.0'
	*   and end is 0 when there is no declaration present.
	*/
	validate(xmlData) {
		if (!xmlData.startsWith("<?xml")) {
			if (!this.optional) this._throwError("InvalidXml", "XML declaration is required but missing.", {
				line: 1,
				col: 1
			});
			return {
				version: "1.0",
				end: 0
			};
		}
		const piEnd = xmlData.indexOf("?>");
		if (piEnd === -1) this._throwError("InvalidXml", "XML declaration is not closed with \"?>\".", {
			line: 1,
			col: 1
		});
		const declBody = xmlData.substring(5, piEnd);
		const end = piEnd + 2;
		const ALLOWED = [
			"version",
			"encoding",
			"standalone"
		];
		const { matches: declAttrs, leftover } = scanDeclAttributes(declBody);
		let version = "1.0";
		let lastAllowedIdx = -1;
		for (let m = 0; m < declAttrs.length; m++) {
			const attrName = declAttrs[m].name;
			const attrValue = declAttrs[m].value;
			const attrPos = declAttrs[m].index;
			const allowedIdx = ALLOWED.indexOf(attrName);
			if (allowedIdx === -1) this._throwError("InvalidXml", "XML declaration contains unknown attribute \"" + attrName + "\". Allowed: version, encoding, standalone.", {
				line: 1,
				col: 6 + attrPos
			});
			if (this.argPosition && allowedIdx <= lastAllowedIdx) this._throwError("InvalidXml", "XML declaration attribute \"" + attrName + "\" is out of order. Required order: version, encoding, standalone.", {
				line: 1,
				col: 6 + attrPos
			});
			lastAllowedIdx = allowedIdx;
			if (attrName === "version") {
				if (attrValue !== "1.0" && attrValue !== "1.1") this._throwError("InvalidXml", "XML declaration version \"" + attrValue + "\" is not supported. Must be \"1.0\" or \"1.1\".", {
					line: 1,
					col: 6 + attrPos
				});
				version = attrValue;
			} else if (attrName === "standalone") {
				if (attrValue !== "yes" && attrValue !== "no") this._throwError("InvalidXml", "XML declaration standalone \"" + attrValue + "\" is invalid. Must be \"yes\" or \"no\".", {
					line: 1,
					col: 6 + attrPos
				});
			}
		}
		const trimmedLeftover = leftover.trim();
		if (trimmedLeftover.length > 0) this._throwError("InvalidXml", "XML declaration contains invalid content: \"" + trimmedLeftover + "\".", {
			line: 1,
			col: 1
		});
		return {
			version,
			end
		};
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/ControlCharValidator.js
/**
* ControlCharValidator — single responsibility: detect illegal control
* characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) anywhere they appear as
* literal characters in the document (element text, attribute values,
* comments, CDATA, PI content, etc.).
*
* This check is always on — it is not gated by any option — since illegal
* control characters make a document non-well-formed per the XML spec.
*/
var ControlCharValidator = class {
	/**
	* Scan `str` for the first illegal control character.
	* @param {string} str
	* @returns {number} local index (within `str`) of the first offending
	*   character, or -1 if none found.
	*/
	static findIllegalIndex(str) {
		const len = str.length;
		for (let i = 0; i < len; i++) if (isIllegalControlCode(str.charCodeAt(i))) return i;
		return -1;
	}
	/**
	* @param {string} str
	* @returns {boolean}
	*/
	static hasIllegalChar(str) {
		return this.findIllegalIndex(str) !== -1;
	}
	/**
	* Convenience formatter for error messages.
	* @param {number} code - char code
	*/
	static describe(code) {
		return `0x${code.toString(16).padStart(2, "0")}`;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/AttributeStringValidator.js
/**
* Walk `attrStr` once, left to right, splitting it into attribute tokens.
*
* This replaces a regex that used to do the same job
* (`(\s*)([^\s=]+)(\s*=)?(\s*(['"])(([\s\S])*?)\5)?`). That regex led with an
* optional whitespace group followed by a required "non-whitespace" group.
* On a long run of whitespace that never resolves into an attribute name
* (e.g. a tag with thousands of trailing spaces before `>`), the engine
* backtracks the whitespace group one character at a time before giving up
* and moving to the next starting position — one full backtrack per
* position, which is quadratic in the length of the run. A ~64KB tag made
* entirely of spaces could stall the whole process for seconds.
*
* A single forward-only scan can never backtrack, so it can't be made slow
* this way no matter how much whitespace the input contains — it's always
* proportional to the length of the string, once.
*
* Each returned token mirrors the shape the old regex match array had, so
* the validation logic below (which reads token[1]..token[6]) didn't need
* to change:
*   token.startIndex - where this token begins in attrStr
*   token[1]          - leading whitespace before the name
*   token[2]          - the attribute name
*   token[3]          - whitespace + '=' if present, else undefined
*   token[4]          - marker (any defined value) if a quoted value was found
*   token[5]          - the quote character used ('"' or "'")
*   token[6]          - the value's text, without the surrounding quotes
*
* A malformed leading character (e.g. a stray '=' with no name before it)
* is simply skipped over, one character at a time — the same outcome the
* old regex produced by failing to match at that position and retrying at
* the next one.
*/
function scanAttributeTokens(attrStr) {
	const tokens = [];
	const len = attrStr.length;
	let i = 0;
	while (i < len) {
		const tokenStart = i;
		while (i < len && isWhiteSpace(attrStr[i])) i++;
		if (i >= len) break;
		if (attrStr[i] === "=") {
			i = tokenStart + 1;
			continue;
		}
		const leadingWs = attrStr.slice(tokenStart, i);
		const nameStart = i;
		while (i < len && !isWhiteSpace(attrStr[i]) && attrStr[i] !== "=") i++;
		const name = attrStr.slice(nameStart, i);
		let equalsGroup;
		let j = i;
		while (j < len && isWhiteSpace(attrStr[j])) j++;
		if (j < len && attrStr[j] === "=") {
			equalsGroup = attrStr.slice(i, j + 1);
			i = j + 1;
		}
		let quoteChar;
		let value;
		let k = i;
		while (k < len && isWhiteSpace(attrStr[k])) k++;
		if (k < len && (attrStr[k] === "\"" || attrStr[k] === "'")) {
			const valueStart = k + 1;
			const closeIdx = attrStr.indexOf(attrStr[k], valueStart);
			if (closeIdx !== -1) {
				quoteChar = attrStr[k];
				value = attrStr.slice(valueStart, closeIdx);
				i = closeIdx + 1;
			}
		}
		const token = { startIndex: tokenStart };
		token[1] = leadingWs;
		token[2] = name;
		token[3] = equalsGroup;
		token[4] = quoteChar !== void 0 ? true : void 0;
		token[5] = quoteChar;
		token[6] = value;
		tokens.push(token);
	}
	return tokens;
}
/**
* AttributeStringValidator — single responsibility: validate the raw
* attribute-expression substring of a start tag (everything between the tag
* name and the closing `>`/`/>`).
*
* Checks performed (always on):
*   - proper whitespace separation between attributes
*   - attribute names are valid QNames
*   - no duplicate attribute names
*   - `=` present without a value -> "without value"
*   - value present but not quoted -> UnquotedAttributeValue
*   - boolean attributes rejected unless `allowBooleanAttributes`
*   - illegal control characters inside the attribute value
*   - `xmlns:x=""` only allowed in XML 1.1
*
* Checks performed (opt-in via `invalidCharSequence.attrLt`):
*   - literal `<` inside an attribute value
*/
var AttributeStringValidator = class {
	/**
	* @param {object} options - the full validation options object
	* @param {import('./XmlNameValidator.js').default} nameValidator
	* @param {string} xmlVersion
	*/
	constructor(options, nameValidator, xmlVersion) {
		this.options = options;
		this.nameValidator = nameValidator;
		this.xmlVersion = xmlVersion;
	}
	/**
	* @param {string} attrStr
	* @returns {true | { err: { code: string, msg: string, line: number } }}
	*/
	validate(attrStr) {
		const matches = scanAttributeTokens(attrStr);
		const attrNames = {};
		const checkAttrLt = this.options.invalidCharSequence?.attrLt === true;
		for (let i = 0; i < matches.length; i++) {
			const m = matches[i];
			if (m[1].length === 0) return this._err("InvalidAttr", "Attribute '" + m[2] + "' has no space in starting.", m);
			const hasEquals = m[3] !== void 0;
			const hasQuotedValue = m[4] !== void 0;
			if (hasEquals && !hasQuotedValue) return this._err("UnquotedAttributeValue", "Attribute '" + m[2] + "' is without value.", m);
			else if (!hasEquals && !this.options.allowBooleanAttributes) return this._err("InvalidAttr", "boolean attribute '" + m[2] + "' is not allowed.", m);
			const attrName = m[2];
			if (!this.nameValidator.isValidQName(attrName)) return this._err("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", m);
			const attrValue = m[6] || "";
			if (hasQuotedValue) {
				const illegalIdx = ControlCharValidator.findIllegalIndex(attrValue);
				if (illegalIdx !== -1) {
					const code = attrValue.charCodeAt(illegalIdx);
					return this._err("IllegalCharacter", `Illegal control character ${ControlCharValidator.describe(code)} in attribute '${attrName}' value.`, m);
				}
				if (checkAttrLt && attrValue.indexOf("<") !== -1) return this._err("InvalidAttr", `Attribute '${attrName}' value must not contain '<'.`, m);
			}
			if (attrName.startsWith("xmlns:") && m[6] === "" && this.xmlVersion === "1.0") return this._err("InvalidAttr", `Undeclaring the prefixed namespace ${attrName}="" is only permitted in XML 1.1 documents.`, m);
			if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) attrNames[attrName] = 1;
			else return this._err("InvalidAttr", "Attribute '" + attrName + "' is repeated.", m);
		}
		return true;
	}
	_err(code, msg, match) {
		return { err: {
			code,
			msg,
			line: getPositionFromMatch(match)
		} };
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/CommentCdataReader.js
/**
* CommentCdataReader — single responsibility: recognize and consume
* `<!-- comment -->`, `<![CDATA[ ... ]]>` and `<!DOCTYPE ...>` constructs
* starting at a given index (which points at the `!`), returning the index
* of the last character consumed (the closing `>`).
*
* DOCTYPE handling is fully delegated to a DocTypeValidator instance passed
* to `read()` by the caller (SyntaxValidator), since DOCTYPE parsing is a
* large, separate concern in its own right.
*
* Opt-in checks (via `invalidCharSequence`):
*   - `comment: true`  -> literal `--` inside a comment's body is rejected
*     (besides the sequence immediately before the closing `-->`).
*/
var CommentCdataReader = class {
	constructor(options = {}) {
		this.checkCommentDashes = options.invalidCharSequence?.comment === true;
	}
	/**
	* @param {string} xmlData
	* @param {number} i - index of the '!' character
	* @param {import('./DocTypeValidator.js').default} docTypeValidator
	* @returns {number} index of the last character consumed
	*/
	read(xmlData, i, docTypeValidator) {
		if (xmlData.length > i + 2 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") return this._readComment(xmlData, i);
		else if (xmlData.length > i + 7 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") return docTypeValidator.validateDocType(xmlData, i - 1);
		else if (xmlData.length > i + 8 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") return this._readCdata(xmlData, i);
		else throw new Error("Invalid construct starting with '<!'.");
	}
	_readComment(xmlData, i) {
		const bodyStart = i + 3;
		for (i = bodyStart; i < xmlData.length; i++) if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
			i += 2;
			break;
		}
		if (xmlData[i] !== ">") throw new Error("Comment is not closed with \"-->\".");
		const body = xmlData.substring(bodyStart, i - 2);
		const illegalIdx = ControlCharValidator.findIllegalIndex(body);
		if (illegalIdx !== -1) {
			const code = body.charCodeAt(illegalIdx);
			throw new Error(`Illegal control character ${ControlCharValidator.describe(code)} in comment.`);
		}
		if (this.checkCommentDashes && body.indexOf("--") !== -1) throw new Error(`Comment must not contain '--'.`);
		return i;
	}
	_readCdata(xmlData, i) {
		const bodyStart = i + 8;
		for (i = bodyStart; i < xmlData.length; i++) if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
			i += 2;
			break;
		}
		if (xmlData[i] !== ">") throw new Error("CDATA section is not closed with \"]]>\".");
		const body = xmlData.substring(bodyStart, i - 2);
		const illegalIdx = ControlCharValidator.findIllegalIndex(body);
		if (illegalIdx !== -1) {
			const code = body.charCodeAt(illegalIdx);
			throw new Error(`Illegal control character ${ControlCharValidator.describe(code)} in CDATA section.`);
		}
		return i;
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/SkipTagMatcher.js
/**
* SkipTagMatcher — single responsibility: decide whether a tag currently
* being opened should be excluded from validation, based on a list of path
* expressions supplied via `options.skipTags` (same expression syntax as
* `path-expression-matcher`, e.g. `"..script"`, `"root.data.raw"`,
* `"row[type=raw]"`).
*
* Skip decisions are only ever made for tags reached through normal
* (non-skipped) parsing — once a match is found, the caller
* (`SyntaxValidator`) consumes the whole matched subtree as opaque raw text
* (mirroring how CDATA is treated) and calls `pop()` once for that tag, so
* this matcher's path stack never needs to represent the skipped subtree's
* internal structure.
*/
var SkipTagMatcher = class {
	/**
	* @param {Array<string>} [skipTags]
	*/
	constructor(skipTags = []) {
		this._expressions = skipTags.map((expr) => new Expression(expr));
		this._matcher = new Matcher();
		this._enabled = this._expressions.length > 0;
	}
	get enabled() {
		return this._enabled;
	}
	/**
	* Push the tag currently being opened onto the path and report whether it
	* (and its whole subtree) should be skipped.
	* @param {string} tagName
	* @param {Record<string,string>} [rawAttributes] - for `[attr=value]` conditions
	* @returns {boolean}
	*/
	push(tagName, rawAttributes) {
		if (!this._enabled) return false;
		this._matcher.push(tagName, rawAttributes || null);
		for (let i = 0; i < this._expressions.length; i++) if (this._matcher.matches(this._expressions[i])) return true;
		return false;
	}
	/** Pop the most recently pushed tag off the path (tag fully closed). */
	pop() {
		if (!this._enabled) return;
		this._matcher.pop();
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/RawSubtreeReader.js
/**
* RawSubtreeReader — single responsibility: given the index right after a
* skipped tag's opening `>`, consume raw characters until the literal
* closing tag `</tagName>` (optional whitespace before `>`) is found.
*
* Deliberately does NOT try to parse anything in between: skipped content is
* assumed to be non-XML or otherwise not meant to be validated (script/style
* bodies, vendor blobs, etc.), so it may contain unmatched `<`, quotes, or
* anything else. This mirrors how CDATA content is treated — opaque text,
* found by looking for its one true terminator.
*
* Same-name tags never "nest" under this strategy — the first `</tagName>`
* found ends the skip, matching the common script/style use case. Use a more
* specific skip expression (e.g. targeting only the outermost occurrence) if
* your skipped content can itself contain literal `</tagName>` text.
*/
var RawSubtreeReader = class {
	/**
	* @param {string} xmlData
	* @param {string} tagName
	* @param {number} i - index right after the opening tag's '>'
	* @returns {number} index of the matching closing tag's own '>'
	*/
	static consume(xmlData, tagName, i) {
		const needle = "</" + tagName;
		let searchFrom = i;
		while (true) {
			const idx = xmlData.indexOf(needle, searchFrom);
			if (idx === -1) throw new Error(`Unclosed skipped tag '${tagName}'.`);
			let j = idx + needle.length;
			while (j < xmlData.length && /\s/.test(xmlData[j])) j++;
			if (xmlData[j] === ">") return j;
			searchFrom = idx + needle.length;
		}
	}
};
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/validators/DocTypeValidator.js
const defaultOptions$1 = {
	maxEntityCount: Infinity,
	maxEntitySize: Infinity
};
var DocTypeValidator = class {
	constructor(options, xmlVersion = "1.0") {
		this.options = Object.assign({}, defaultOptions$1, options);
		this.suppressValidationErr = !options;
		this.xmlVersion = xmlVersion;
	}
	validateDocType(xmlData, i) {
		if (xmlData[i + 3] !== "O" || xmlData[i + 4] !== "C" || xmlData[i + 5] !== "T" || xmlData[i + 6] !== "Y" || xmlData[i + 7] !== "P" || xmlData[i + 8] !== "E") throw new Error(`Invalid Tag instead of DOCTYPE`);
		i += 9;
		let angleBracketsCount = 1;
		let hasBody = false;
		let comment = false;
		let quoteChar = null;
		let entityCount = 0;
		for (; i < xmlData.length; i++) {
			if (quoteChar !== null) {
				if (xmlData[i] === quoteChar) quoteChar = null;
				continue;
			}
			if (!hasBody && !comment && (xmlData[i] === "\"" || xmlData[i] === "'")) {
				quoteChar = xmlData[i];
				continue;
			}
			if (xmlData[i] === "<" && !comment) {
				if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
					i += 7;
					[entityCount, i] = this._validateEntityExp(xmlData, i + 1, entityCount);
				} else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
					i += 8;
					i = this._validateElementExp(xmlData, i + 1);
				} else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
					i += 8;
					i = this._validateAttlistExp(xmlData, i + 1);
					continue;
				} else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
					i += 9;
					i = this._validateNotationExp(xmlData, i + 1);
				} else if (hasSeq(xmlData, "!--", i)) comment = true;
				else throw new Error(`Invalid DOCTYPE`);
				angleBracketsCount++;
			} else if (xmlData[i] === ">") {
				if (comment) {
					if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
						comment = false;
						angleBracketsCount--;
					}
				} else angleBracketsCount--;
				if (angleBracketsCount === 0) break;
			} else if (xmlData[i] === "[") hasBody = true;
		}
		if (quoteChar !== null || angleBracketsCount !== 0) throw new Error(`Unclosed DOCTYPE`);
		return i;
	}
	_validateEntityExp(xmlData, i, entityCount) {
		i = skipWhitespace(xmlData, i);
		const nameStart = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== "\"" && xmlData[i] !== "'") i++;
		const entityName = xmlData.substring(nameStart, i);
		validateName(entityName, this.xmlVersion);
		i = skipWhitespace(xmlData, i);
		if (!this.suppressValidationErr) {
			if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") throw new Error("External entities are not supported");
			else if (xmlData[i] === "%") throw new Error("Parameter entities are not supported");
		}
		let entityValue;
		[i, entityValue] = readQuotedValue(xmlData, i, "entity");
		const { maxEntitySize, maxEntityCount } = this.options;
		if (entityValue.length > maxEntitySize) throw new Error(`Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${maxEntitySize})`);
		if (entityValue.indexOf("&") === -1) {
			entityCount++;
			if (entityCount > maxEntityCount) throw new Error(`Entity count (${entityCount}) exceeds maximum allowed (${maxEntityCount})`);
		}
		return [entityCount, i - 1];
	}
	_validateNotationExp(xmlData, i) {
		i = skipWhitespace(xmlData, i);
		const nameStart = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		const notationName = xmlData.substring(nameStart, i);
		!this.suppressValidationErr && validateName(notationName, this.xmlVersion);
		i = skipWhitespace(xmlData, i);
		const identifierType = xmlData.substring(i, i + 6).toUpperCase();
		if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
		i += identifierType.length;
		i = skipWhitespace(xmlData, i);
		if (identifierType === "PUBLIC") {
			[i] = readQuotedValue(xmlData, i, "publicIdentifier");
			i = skipWhitespace(xmlData, i);
			if (xmlData[i] === "\"" || xmlData[i] === "'") [i] = readQuotedValue(xmlData, i, "systemIdentifier");
		} else if (identifierType === "SYSTEM") [i] = readQuotedValue(xmlData, i, "systemIdentifier");
		return --i;
	}
	_validateElementExp(xmlData, i) {
		i = skipWhitespace(xmlData, i);
		const nameStart = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		const elementName = xmlData.substring(nameStart, i);
		if (!this.suppressValidationErr && !name$1(elementName, { xmlVersion: this.xmlVersion })) throw new Error(`Invalid element name: "${elementName}"`);
		i = skipWhitespace(xmlData, i);
		if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
		else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
		else if (xmlData[i] === "(") {
			i++;
			while (i < xmlData.length && xmlData[i] !== ")") i++;
			if (xmlData[i] !== ")") throw new Error("Unterminated content model");
		} else if (!this.suppressValidationErr) throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
		return i;
	}
	_validateAttlistExp(xmlData, i) {
		i = skipWhitespace(xmlData, i);
		const elemNameStart = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		validateName(xmlData.substring(elemNameStart, i), this.xmlVersion);
		i = skipWhitespace(xmlData, i);
		const attrNameStart = i;
		while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
		validateName(xmlData.substring(attrNameStart, i), this.xmlVersion);
		i = skipWhitespace(xmlData, i);
		if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
			i += 8;
			i = skipWhitespace(xmlData, i);
			if (xmlData[i] !== "(") throw new Error(`Expected '(', found "${xmlData[i]}"`);
			i++;
			while (i < xmlData.length && xmlData[i] !== ")") {
				const notationStart = i;
				while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") i++;
				validateName(xmlData.substring(notationStart, i).trim(), this.xmlVersion);
				if (xmlData[i] === "|") {
					i++;
					i = skipWhitespace(xmlData, i);
				}
			}
			if (xmlData[i] !== ")") throw new Error("Unterminated list of notations");
			i++;
		} else {
			const typeStart = i;
			while (i < xmlData.length && !/\s/.test(xmlData[i])) i++;
			const attributeType = xmlData.substring(typeStart, i);
			if (!this.suppressValidationErr && ![
				"CDATA",
				"ID",
				"IDREF",
				"IDREFS",
				"ENTITY",
				"ENTITIES",
				"NMTOKEN",
				"NMTOKENS"
			].includes(attributeType.toUpperCase())) throw new Error(`Invalid attribute type: "${attributeType}"`);
		}
		i = skipWhitespace(xmlData, i);
		if (xmlData.substring(i, i + 9).toUpperCase() === "#REQUIRED") i += 9;
		else if (xmlData.substring(i, i + 8).toUpperCase() === "#IMPLIED") i += 8;
		else [i] = readQuotedValue(xmlData, i, "ATTLIST default value");
		return i;
	}
};
function skipWhitespace(data, index) {
	while (index < data.length && /\s/.test(data[index])) index++;
	return index;
}
function hasSeq(data, seq, i) {
	for (let j = 0; j < seq.length; j++) if (seq[j] !== data[i + j + 1]) return false;
	return true;
}
function validateName(name, xmlVersion = "1.0") {
	if (!name$1(name, { xmlVersion })) throw new Error(`Invalid entity name "${name}"`);
}
/**
* Read a single- or double-quoted string and return [nextIndex, value].
*/
function readQuotedValue(xmlData, i, type) {
	const startChar = xmlData[i];
	if (startChar !== "\"" && startChar !== "'") throw new Error(`Expected quoted string for ${type}, found "${startChar}"`);
	i++;
	const start = i;
	while (i < xmlData.length && xmlData[i] !== startChar) i++;
	if (xmlData[i] !== startChar) throw new Error(`Unterminated ${type} value`);
	const value = xmlData.substring(start, i);
	return [++i, value];
}
//#endregion
//#region ../../../node_modules/.pnpm/fast-xml-validator@1.4.2/node_modules/fast-xml-validator/src/SyntaxValidator.js
const defaultOptions = {
	allowBooleanAttributes: false,
	unpairedTags: [],
	docType: {
		maxEntityCount: Infinity,
		maxEntitySize: Infinity
	},
	invalidCharSequence: {
		comment: false,
		tagValue: false,
		attrLt: false
	},
	xmlDeclaraion: {
		optional: true,
		argPosition: true
	},
	multipleRoots: true,
	skipTags: []
};
/**
* SyntaxValidator — validates that an XML document is well-formed.
*
* This is an orchestrator: it owns the top-level character scan and the
* open/close tag stack, and delegates every other concern to a focused,
* single-responsibility collaborator:
*
*   - XmlDeclarationValidator  — the `<?xml ... ?>` prolog
*   - DocTypeValidator         — `<!DOCTYPE ...>`
*   - CommentCdataReader       — `<!-- -->` and `<![CDATA[ ]]>`
*   - AttributeStringValidator — a tag's attribute expression
*   - XmlNameValidator         — element/attribute/PI name well-formedness
*   - ControlCharValidator     — illegal control characters (always on)
*   - SkipTagMatcher / RawSubtreeReader — `skipTags` support
*
* Usage: `new SyntaxValidator(options).validate(xmlData)` or the static
* convenience `SyntaxValidator.validate(xmlData, options)`.
*/
var SyntaxValidator = class SyntaxValidator {
	constructor(options) {
		this.options = mergeOptions(defaultOptions, options);
	}
	/** Static convenience wrapper — matches the historical fxv v1 API. */
	static validate(xmlData, options) {
		return new SyntaxValidator(options).validate(xmlData);
	}
	validate(xmlData) {
		const options = this.options;
		const tags = [];
		let tagFound = false;
		let reachedRoot = false;
		let docTypeSeen = false;
		if (xmlData[0] === "﻿") xmlData = xmlData.substr(1);
		const throwError = (code, message, lineNumber) => {
			throw new ValidationError(message, code, lineNumber.line || lineNumber, lineNumber.col);
		};
		const declResult = new XmlDeclarationValidator(options.xmlDeclaraion, throwError).validate(xmlData);
		const xmlVersion = declResult.version;
		xmlData = xmlData.substring(declResult.end);
		const docTypeValidator = new DocTypeValidator(options.docType, xmlVersion);
		const commentCdataReader = new CommentCdataReader(options);
		const nameValidator = new XmlNameValidator(xmlVersion);
		const attrValidator = new AttributeStringValidator(options, nameValidator, xmlVersion);
		const skipMatcher = new SkipTagMatcher(options.skipTags);
		const checkTagValueSeq = options.invalidCharSequence?.tagValue === true;
		const checkDocTypePlacement = (startBang) => {
			if (!(xmlData.substring(startBang, startBang + 9).toUpperCase() === "<!DOCTYPE")) return;
			if (docTypeSeen) throwError("InvalidXml", "Multiple DOCTYPE declarations found.", getLineNumberForPosition(xmlData, startBang));
			if (tagFound || tags.length > 0) throwError("InvalidXml", "DOCTYPE must appear before the root element.", getLineNumberForPosition(xmlData, startBang));
			docTypeSeen = true;
		};
		for (let i = 0; i < xmlData.length; i++) if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
			i += 2;
			i = this._readPI(xmlData, i, nameValidator, throwError);
		} else if (xmlData[i] === "<") {
			let tagStartPos = i;
			i++;
			if (xmlData[i] === "!") {
				try {
					checkDocTypePlacement(tagStartPos);
					i = commentCdataReader.read(xmlData, i, docTypeValidator);
				} catch (err) {
					throwError("InvalidDocType", err.message, getLineNumberForPosition(xmlData, i - 1));
				}
				continue;
			} else {
				let closingTag = false;
				if (xmlData[i] === "/") {
					closingTag = true;
					i++;
				}
				let tagName = "";
				for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) tagName += xmlData[i];
				tagName = tagName.trim();
				if (tagName[tagName.length - 1] === "/") {
					tagName = tagName.substring(0, tagName.length - 1);
					i--;
				}
				if (!nameValidator.isValidQName(tagName)) {
					let msg;
					if (tagName.trim().length === 0) msg = "Invalid space after '<'.";
					else msg = "Tag '" + tagName + "' is an invalid name.";
					throwError("InvalidTag", msg, getLineNumberForPosition(xmlData, tagStartPos));
				}
				const result = this._readAttributeStr(xmlData, i);
				if (result === false) throwError("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
				let attrStr = result.value;
				i = result.index;
				if (attrStr[attrStr.length - 1] === "/") {
					const attrStrStart = i - attrStr.length;
					attrStr = attrStr.substring(0, attrStr.length - 1);
					const isValid = attrValidator.validate(attrStr);
					if (isValid === true) {
						if (reachedRoot === true && !options.multipleRoots) throwError("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, tagStartPos));
						tagFound = true;
						if (tags.length === 0) reachedRoot = true;
						skipMatcher.push(tagName);
						skipMatcher.pop();
					} else throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
				} else if (closingTag) if (!result.tagClosed) throwError("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
				else if (attrStr.trim().length > 0) throwError("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
				else if (tags.length === 0) throwError("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
				else {
					const otg = tags.pop();
					if (tagName !== otg.tagName) {
						let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
						throwError("InvalidTag", "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.", getLineNumberForPosition(xmlData, tagStartPos));
					}
					skipMatcher.pop();
					if (tags.length === 0) reachedRoot = true;
				}
				else {
					const skip = skipMatcher.push(tagName);
					if (!skip) {
						const isValid = attrValidator.validate(attrStr);
						if (isValid !== true) throwError(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
					}
					if (reachedRoot === true && !options.multipleRoots) throwError("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
					else if (options.unpairedTags.indexOf(tagName) !== -1) skipMatcher.pop();
					else if (skip) {
						i = RawSubtreeReader.consume(xmlData, tagName, i + 1);
						skipMatcher.pop();
						if (tags.length === 0) reachedRoot = true;
						tagFound = true;
						continue;
					} else tags.push({
						tagName,
						tagStartPos
					});
					tagFound = true;
				}
				let prevTwo = "";
				for (i++; i < xmlData.length; i++) if (xmlData[i] === "<") if (xmlData[i + 1] === "!") {
					i++;
					try {
						checkDocTypePlacement(i - 1);
						i = commentCdataReader.read(xmlData, i, docTypeValidator);
					} catch (err) {
						throwError("InvalidDocType", err.message, getLineNumberForPosition(xmlData, i - 1));
					}
					prevTwo = "";
					continue;
				} else if (xmlData[i + 1] === "?") {
					i += 2;
					i = this._readPI(xmlData, i, nameValidator, throwError);
					prevTwo = "";
				} else break;
				else if (xmlData[i] === "&") {
					const afterAmp = this._validateAmpersand(xmlData, i);
					if (afterAmp === -1) throwError("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
					i = afterAmp;
					prevTwo = "";
				} else {
					const code = xmlData.charCodeAt(i);
					if (isIllegalControlCode(code)) throwError("IllegalCharacter", `Illegal control character ${ControlCharValidator.describe(code)} in document content.`, getLineNumberForPosition(xmlData, i));
					if (reachedRoot === true && tags.length === 0 && !isWhiteSpace(xmlData[i])) throwError("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
					if (checkTagValueSeq) {
						prevTwo = (prevTwo + xmlData[i]).slice(-2);
						if (prevTwo === "]]" && xmlData[i + 1] === ">") throwError("InvalidXml", "Element text content must not contain ']]>'.", getLineNumberForPosition(xmlData, i - 1));
					}
				}
				if (xmlData[i] === "<") i--;
			}
		} else {
			if (isWhiteSpace(xmlData[i])) continue;
			if (reachedRoot) throwError("InvalidXml", "Extra text at the end: '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
			throwError("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
		}
		if (!tagFound) throwError("InvalidXml", "Start tag expected.", {
			line: 1,
			col: 1
		});
		else if (tags.length === 1) throwError("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
		else if (tags.length > 0) throwError("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName)).replace(/\r?\n/g, "") + "' found.", {
			line: 1,
			col: 1
		});
		return true;
	}
	_readPI(xmlData, i, nameValidator, throwError) {
		const piStart = i;
		const nameStart = i;
		let nameValidated = false;
		for (; i < xmlData.length; i++) {
			const ch = xmlData[i];
			if (!nameValidated && (ch === " " || ch === "?")) {
				const piName = xmlData.substr(nameStart, i - nameStart);
				nameValidated = true;
				if (piName.toLowerCase() === "xml") throwError("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, piStart - 2));
				else if (!nameValidator.isValidName(piName)) throwError("InvalidXml", `Processing instruction target "${piName}" is not a valid XML Name.`, getLineNumberForPosition(xmlData, piStart - 2));
			}
			if (ch === "?" && xmlData[i + 1] === ">") {
				i++;
				return i;
			}
		}
		throwError("InvalidXml", "Processing instruction is not closed with \"?>\".", getLineNumberForPosition(xmlData, piStart - 2));
	}
	_readAttributeStr(xmlData, i) {
		let attrStr = "";
		let startChar = "";
		let tagClosed = false;
		for (; i < xmlData.length; i++) {
			if (xmlData[i] === "\"" || xmlData[i] === "'") if (startChar === "") startChar = xmlData[i];
			else if (startChar !== xmlData[i]) {} else startChar = "";
			else if (xmlData[i] === ">") {
				if (startChar === "") {
					tagClosed = true;
					break;
				}
			}
			attrStr += xmlData[i];
		}
		if (startChar !== "") return false;
		return {
			value: attrStr,
			index: i,
			tagClosed
		};
	}
	_validateNumberAmpersand(xmlData, i) {
		let re = /\d/;
		if (xmlData[i] === "x") {
			i++;
			re = /[\da-fA-F]/;
		}
		for (; i < xmlData.length; i++) {
			if (xmlData[i] === ";") return i;
			if (!xmlData[i].match(re)) break;
		}
		return -1;
	}
	_validateAmpersand(xmlData, i) {
		i++;
		if (xmlData[i] === ";") return -1;
		if (xmlData[i] === "#") {
			i++;
			return this._validateNumberAmpersand(xmlData, i);
		}
		let count = 0;
		for (; i < xmlData.length; i++, count++) {
			if (xmlData[i].match(/\w/) && count < 20) continue;
			if (xmlData[i] === ";") break;
			return -1;
		}
		return i;
	}
};
function mergeOptions(defaults, options) {
	const merged = Object.assign({}, defaults, options);
	merged.docType = Object.assign({}, defaults.docType, options?.docType);
	merged.invalidCharSequence = Object.assign({}, defaults.invalidCharSequence, options?.invalidCharSequence);
	merged.xmlDeclaraion = Object.assign({}, defaults.xmlDeclaraion, options?.xmlDeclaraion, options?.xmlDeclaration);
	merged.skipTags = options?.skipTags || defaults.skipTags;
	return merged;
}
//#endregion
//#region lib/types/rss.js
/** Feed XML is malformed or lacks a recognized RSS, RDF, or Atom container. */
var RssParseError = class extends Error {
	/** Distinguishes invalid XML syntax from a missing feed container. */
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
/**
* Parse RSS, RDF, or Atom entries, omitting entries without a source URL and rejecting invalid feeds.
* @param xml - Feed XML to validate and parse.
* @param options - Source identifier used to namespace candidate identifiers.
* @returns Normalized candidates with the first entry retained for each deduplication key.
*/
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
	/** HTTP status returned by the failed feed request. */
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
/**
* Hydrate from the backend, then persist after each accepted record.
* @param backend - Loads initial records and saves complete snapshots; load failures reject creation.
* @returns A hydrated store whose flush rejects with the first save failure in each drained batch.
*/
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
/**
* Backend storing submit records as a JSON document at `path`.
* @param path - Destination file; missing files load as empty, while malformed contents reject.
* @returns A backend that replaces the file through a temporary file and applies owner-only permissions.
*/
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
var __runInitializers$1 = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate$1 = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
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
			_preferences_decorators = [Remote("preferences")];
			_recordSearch_decorators = [Remote("recordSearch")];
			_toggleFavorite_decorators = [Remote("toggleFavorite")];
			_deleteSearch_decorators = [Remote("deleteSearch")];
			_clearHistory_decorators = [Remote("clearHistory")];
			_search_decorators = [Remote("search")];
			_list_decorators = [Remote("list")];
			_add_decorators = [Remote("add")];
			_submissions_decorators = [Remote("submissions")];
			_resubmit_decorators = [Remote("resubmit")];
			_status_decorators = [Remote("status")];
			_refresh_decorators = [Remote("refresh")];
			__esDecorate$1(this, null, _preferences_decorators, {
				kind: "method",
				name: "preferences",
				static: false,
				private: false,
				access: {
					has: (obj) => "preferences" in obj,
					get: (obj) => obj.preferences
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _recordSearch_decorators, {
				kind: "method",
				name: "recordSearch",
				static: false,
				private: false,
				access: {
					has: (obj) => "recordSearch" in obj,
					get: (obj) => obj.recordSearch
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _toggleFavorite_decorators, {
				kind: "method",
				name: "toggleFavorite",
				static: false,
				private: false,
				access: {
					has: (obj) => "toggleFavorite" in obj,
					get: (obj) => obj.toggleFavorite
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _deleteSearch_decorators, {
				kind: "method",
				name: "deleteSearch",
				static: false,
				private: false,
				access: {
					has: (obj) => "deleteSearch" in obj,
					get: (obj) => obj.deleteSearch
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _clearHistory_decorators, {
				kind: "method",
				name: "clearHistory",
				static: false,
				private: false,
				access: {
					has: (obj) => "clearHistory" in obj,
					get: (obj) => obj.clearHistory
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _search_decorators, {
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
			__esDecorate$1(this, null, _list_decorators, {
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
			__esDecorate$1(this, null, _add_decorators, {
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
			__esDecorate$1(this, null, _submissions_decorators, {
				kind: "method",
				name: "submissions",
				static: false,
				private: false,
				access: {
					has: (obj) => "submissions" in obj,
					get: (obj) => obj.submissions
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _resubmit_decorators, {
				kind: "method",
				name: "resubmit",
				static: false,
				private: false,
				access: {
					has: (obj) => "resubmit" in obj,
					get: (obj) => obj.resubmit
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate$1(this, null, _status_decorators, {
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
			__esDecorate$1(this, null, _refresh_decorators, {
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
		/** Mount schema shared with the plugin entry. */
		static get Config() {
			return Config;
		}
		/** The service the tools and the Remote methods share. */
		service = __runInitializers$1(this, _instanceExtraInitializers);
		ready;
		constructor(ctx, config) {
			super(ctx, "download", { namespace: "download" });
			const storeReady = createPersistentSubmitStore(createJsonFileSubmitStoreBackend(resolveStorePath(config.storePath)));
			const preferencesReady = openPreferencesStore(createJsonFilePreferencesBackend(resolveStorePath("downloader/preferences.json")));
			const ready = Promise.all([storeReady, preferencesReady]).then(([store, preferences]) => {
				const client = async () => createAria2Client({
					endpoint: config.endpoint,
					timeoutMs: config.timeoutMs,
					token: (await ctx.credentials.resolve(credentialRef(config.tokenRef)))?.value ?? null
				});
				return createDownloadService({
					store,
					preferences,
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
			this.ready = ready;
			ctx.effect(async () => {
				await ready;
				const store = await storeReady;
				return async () => {
					await Promise.all([store.flush(), (await preferencesReady).flush()]);
				};
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
				refresh: async () => (await ready).refresh()
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
//#endregion
//#region ../../util/values/lib/index.js
/**
* Lazily scanned view of one JSON object's top-level fields, built from text
* that may still be streaming or from an already parsed object. Nothing is
* scanned until a reader asks; the view remembers every question it answered
* and reports changed answers when the owner refreshes for publication.
* Used for model tool-call arguments: a row reads the fields it
* cares about at whatever granularity it displays, at every stage of the call.
* @module @deepseek-ai/dsh-util-values/src/partial-json
*/
const SIMPLE_ESCAPES = {
	"\"": "\"",
	"\\": "\\",
	"/": "/",
	b: "\b",
	f: "\f",
	n: "\n",
	r: "\r",
	t: "	"
};
const CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
function isWhitespace(c) {
	return c === " " || c === "\n" || c === "\r" || c === "	";
}
function isHex(c) {
	return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
}
(class PartialArguments {
	/** The view of a call with no arguments available. */
	static EMPTY = PartialArguments.fromObject({});
	/**
	* View finished argument text without scanning it until a reader asks.
	* @param text - the complete argument JSON text.
	* @returns a sealed view.
	*/
	static fromText(text) {
		const view = new PartialArguments();
		view.append(text);
		view.sealed = true;
		return view;
	}
	/**
	* View an already parsed argument payload, such as a PTC dispatch object.
	* @param value - the parsed argument value.
	* @returns a sealed view; a non-object payload has no fields.
	*/
	static fromObject(value) {
		const view = new PartialArguments();
		view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		view.sealed = true;
		return view;
	}
	/**
	* The source: text so far or a parsed object, plus whether it can still grow.
	* These are the only enumerable fields, so two views over the same source
	* compare equal structurally however far each has been read.
	*/
	chunks = [];
	object;
	sealed = false;
	#ends = [];
	#size = 0;
	#consumed = 0;
	#mode = "root";
	#escape = false;
	#keyStart = 0;
	#keyEscaped = false;
	#key = "";
	#current = null;
	#nestedEnds = [];
	#nestedInString = false;
	#invalidAt;
	#invalidValue = false;
	#entries = /* @__PURE__ */ new Map();
	#order = [];
	#reads = /* @__PURE__ */ new Map();
	/** Whether this view rejects further appends; does not scan text or register reads. */
	get isSealed() {
		return this.sealed;
	}
	/** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
	get invalid() {
		this.scan();
		return this.#mode === "invalid" || this.#invalidValue;
	}
	/**
	* Retain streamed argument text without scanning or comparing observed answers.
	* @param fragment - the text following every fragment appended before.
	*/
	append(fragment) {
		if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
		if (fragment.length === 0) return;
		this.chunks.push(fragment);
		this.#size += fragment.length;
		this.#ends.push(this.#size);
	}
	/**
	* Reconcile a streamed prefix with authoritative complete text without joining the fragments.
	* @param text - the final argument text, which replaces missing or conflicting deltas.
	* @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
	*/
	settle(text) {
		if (this.object !== void 0 || text.length !== this.#size) return PartialArguments.fromText(text);
		let offset = 0;
		for (const chunk of this.chunks) {
			if (!text.startsWith(chunk, offset)) return PartialArguments.fromText(text);
			offset += chunk.length;
		}
		this.chunks = text.length === 0 ? [] : [text];
		this.#ends = text.length === 0 ? [] : [text.length];
		this.sealed = true;
		return this;
	}
	/**
	* Compare observed answers and advance their publication baseline. Unread views remain unscanned.
	* @returns whether any observed answer changed since its first read or the preceding refresh.
	*/
	refresh() {
		if (this.#reads.size === 0) return false;
		this.scan();
		let changed = false;
		let completions = false;
		for (const read of this.#reads.values()) {
			if (read.completion) {
				completions = true;
				continue;
			}
			changed = this.refreshRead(read) || changed;
		}
		if (completions) {
			for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
		}
		if (this.sealed) this.#reads.clear();
		return changed;
	}
	refreshRead(read) {
		const now = read.answer();
		if (Object.is(now, read.last)) return false;
		read.last = now;
		return true;
	}
	/**
	* Check whether no further fields can arrive.
	* @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
	*/
	closed() {
		return this.remember("closed", "", () => this.closedNow());
	}
	/**
	* List discovered fields in first-appearance order.
	* @returns top-level keys seen so far, in first-appearance order.
	*/
	keys() {
		return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
	}
	/**
	* Check whether a top-level field has appeared.
	* @param key - argument name.
	* @returns whether the field has appeared (a string opened or another value began).
	*/
	has(key) {
		return this.remember("has", key, () => this.hasNow(key));
	}
	/**
	* Check whether a field's closing delimiter has arrived, without validating its contents.
	* @param key - argument name.
	* @returns whether its delimiter arrived and no content reader has reported an error for this value.
	*/
	complete(key) {
		return this.remember("complete", key, () => this.completeNow(key));
	}
	/**
	* Read string length without materializing its text.
	* @param key - argument name.
	* @param options - change granularity for a streaming string.
	* @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
	*/
	stringLength(key, options) {
		const step = Math.max(1, Math.floor(options?.step ?? 1));
		const offset = options?.offset ?? 0;
		return this.remember(`length:${step}:${offset}`, key, () => this.lengthNow(key), (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step));
	}
	/**
	* Check a string against a decoded UTF-16 length limit without materializing it.
	* @param key - argument name.
	* @param maxLength - decoded UTF-16 limit, floored to at least zero.
	* @returns whether the string is longer than the limit; false when absent or not a string.
	*/
	stringExceeds(key, maxLength) {
		const limit = Math.max(0, Math.floor(maxLength));
		return this.remember(`exceeds:${limit}`, key, () => (this.lengthNow(key, limit + 1) ?? 0) > limit);
	}
	/**
	* Read a decoded string, including a streaming prefix.
	* @param key - argument name.
	* @returns the string field's decoded text so far; undefined when absent or not a string.
	*/
	text(key) {
		return this.remember("text", key, () => this.textNow(key));
	}
	/**
	* Read at most the first decoded UTF-16 units of a string.
	* @param key - argument name.
	* @param maxLength - maximum decoded UTF-16 length, floored to at least one.
	* @returns the bounded string prefix; undefined when absent or not a string.
	*/
	textPrefix(key, maxLength) {
		const limit = Math.max(1, Math.floor(maxLength));
		return this.remember(`prefix:${limit}`, key, () => this.textPrefixNow(key, limit));
	}
	/**
	* Read a completed non-string argument.
	* @param key - argument name.
	* @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
	*/
	value(key) {
		return this.remember("value", key, () => this.valueNow(key));
	}
	/** Answer a question and, on a streaming view, remember it for change detection. */
	remember(kind, key, read, comparison) {
		this.scan();
		const result = read();
		if (!this.sealed) {
			const id = `${kind}/${key}`;
			if (!this.#reads.has(id)) this.#reads.set(id, {
				completion: kind === "complete",
				answer: comparison === void 0 ? read : () => comparison(read()),
				last: comparison === void 0 ? result : comparison(result)
			});
		}
		return result;
	}
	closedNow() {
		return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
	}
	keysNow() {
		return this.object === void 0 ? this.#order : Object.keys(this.object);
	}
	hasNow(key) {
		return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
	}
	completeNow(key) {
		if (this.object !== void 0) return Object.hasOwn(this.object, key);
		const entry = this.#entries.get(key);
		return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
	}
	lengthNow(key, limit = Number.POSITIVE_INFINITY) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field.length : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
		const read = entry.length ??= {
			at: entry.start,
			length: 0,
			text: ""
		};
		this.readString(entry, read, limit, false);
		return read.length;
	}
	textNow(key) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
			let text;
			try {
				text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
			} catch (_error) {}
			if (text !== void 0) entry.text = {
				at: entry.end,
				length: text.length,
				text
			};
		}
		const read = entry.text ??= {
			at: entry.start,
			length: 0,
			text: ""
		};
		this.readString(entry, read, Number.POSITIVE_INFINITY, true);
		return read.text;
	}
	textPrefixNow(key, maxLength) {
		if (this.object !== void 0) {
			const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
			return typeof field === "string" ? field.slice(0, maxLength) : void 0;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "string") return void 0;
		const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
		let read = prefixes.get(maxLength);
		if (read === void 0) {
			read = {
				at: entry.start,
				length: 0,
				text: ""
			};
			prefixes.set(maxLength, read);
		}
		this.readString(entry, read, maxLength, true);
		return read.text;
	}
	valueNow(key) {
		if (this.object !== void 0) {
			if (!Object.hasOwn(this.object, key)) return void 0;
			const field = this.object[key];
			return typeof field === "string" ? void 0 : field;
		}
		const entry = this.#entries.get(key);
		if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
		if (entry.parsed === void 0) try {
			entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
		} catch (_error) {
			entry.invalid = true;
			this.#invalidValue = true;
		}
		return entry.parsed;
	}
	chunkAt(at) {
		let low = 0;
		let high = this.#ends.length;
		while (low < high) {
			const mid = low + high >>> 1;
			if (this.#ends[mid] <= at) low = mid + 1;
			else high = mid;
		}
		return low;
	}
	/** Materialize only a requested range, never the cumulative source. */
	slice(start, end) {
		if (start >= end) return "";
		const first = this.chunkAt(start);
		const last = this.chunkAt(end - 1);
		const base = first === 0 ? 0 : this.#ends[first - 1];
		if (first === last) return this.chunks[first].slice(start - base, end - base);
		const parts = [this.chunks[first].slice(start - base)];
		for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
		parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
		return parts.join("");
	}
	readString(entry, read, limit, materialize) {
		const end = Math.min(entry.end < 0 ? this.#consumed : entry.end, entry.invalidAt ?? Number.POSITIVE_INFINITY, this.#invalidAt ?? Number.POSITIVE_INFINITY);
		if (!entry.needsDecoding) {
			const length = Math.min(end - read.at, limit - read.length);
			if (length <= 0) return;
			if (materialize) read.text += this.slice(read.at, read.at + length);
			read.at += length;
			read.length += length;
			return;
		}
		let chunkIndex = this.chunkAt(read.at);
		while (read.at < end && read.length < limit) {
			const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
			const chunk = this.chunks[chunkIndex];
			const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
			const boundary = remaining.search(CONTENT_ESCAPE);
			const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
			if (length > 0) {
				if (materialize) read.text += remaining.slice(0, length);
				read.at += length;
				read.length += length;
				if (read.at === base + chunk.length) chunkIndex++;
				continue;
			}
			const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
			let decoded;
			let width = 2;
			if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
			if (remaining[0] === "\\" && type === "u") {
				const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
				let valid = true;
				for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
				if (valid) {
					if (hex.length < 4 && entry.end < 0) return;
					if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
				}
				width = 6;
			} else if (remaining[0] === "\\" && type !== void 0) decoded = SIMPLE_ESCAPES[type];
			if (decoded === void 0) {
				entry.invalidAt = read.at;
				this.#invalidValue = true;
				return;
			}
			if (materialize) read.text += decoded;
			read.length++;
			read.at += width;
			while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
		}
	}
	/** Locate new field ranges without decoding or parsing their contents. */
	scan() {
		if (this.object !== void 0 || this.#consumed === this.#size) return;
		for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
			const pending = this.chunks[i];
			const base = i === 0 ? 0 : this.#ends[i - 1];
			for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
				if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
					const end = this.stringBoundary(pending, index);
					this.#consumed += end - index;
					index = end;
					if (index === pending.length) break;
				}
				this.step(pending[index], this.#consumed);
				this.#consumed++;
			}
		}
	}
	/** Only raw quotes and their preceding backslash runs can terminate a string. */
	stringBoundary(fragment, start) {
		let at = start;
		while (true) {
			const quote = fragment.indexOf("\"", at);
			const end = quote < 0 ? fragment.length : quote;
			if (this.#mode === "string") {
				const entry = this.#current;
				if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
			}
			let slashStart = end;
			while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
			const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
			this.#escape = quote < 0 && escaped;
			if (quote < 0 || !escaped) return end;
			at = quote + 1;
		}
	}
	step(c, at) {
		switch (this.#mode) {
			case "root":
				if (isWhitespace(c)) return;
				if (c === "{") {
					this.#mode = "key-or-end";
					return;
				}
				this.fail();
				return;
			case "key-or-end":
				if (isWhitespace(c)) return;
				if (c === "}") {
					this.#mode = "closed";
					return;
				}
				if (c === "\"") {
					this.beginKey(at);
					return;
				}
				this.fail();
				return;
			case "key-only":
				if (isWhitespace(c)) return;
				if (c === "\"") {
					this.beginKey(at);
					return;
				}
				this.fail();
				return;
			case "key":
				this.stepKey(c, at);
				return;
			case "colon":
				if (isWhitespace(c)) return;
				if (c === ":") {
					this.#mode = "value";
					return;
				}
				this.fail();
				return;
			case "value":
				this.beginValue(c, at);
				return;
			case "string": {
				const entry = this.#current;
				entry.end = at;
				this.#current = null;
				this.#mode = "comma-or-end";
				return;
			}
			case "scalar":
				this.stepScalar(c, at);
				return;
			case "nested":
				this.stepNested(c, at);
				return;
			case "comma-or-end":
				if (isWhitespace(c)) return;
				if (c === ",") {
					this.#mode = "key-only";
					return;
				}
				if (c === "}") {
					this.#mode = "closed";
					return;
				}
				this.fail();
				return;
			case "closed":
				if (isWhitespace(c)) return;
				this.fail();
				return;
			/* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
			case "invalid": return;
			/* v8 ignore next 2 -- Every scanner mode has a handler above. */
			default: assertNever(this.#mode);
		}
	}
	fail() {
		this.#invalidAt = this.#consumed;
		this.#mode = "invalid";
		this.#current = null;
	}
	beginKey(at) {
		this.#mode = "key";
		this.#keyStart = at + 1;
		this.#keyEscaped = false;
		this.#escape = false;
	}
	stepKey(c, at) {
		if (c < " ") {
			this.fail();
			return;
		}
		if (this.#escape) {
			this.#escape = false;
			return;
		}
		if (c === "\\") {
			this.#escape = true;
			this.#keyEscaped = true;
			return;
		}
		if (c !== "\"") return;
		const raw = this.slice(this.#keyStart, at);
		if (this.#keyEscaped) try {
			this.#key = JSON.parse(`"${raw}"`);
		} catch (_error) {
			this.fail();
			return;
		}
		else this.#key = raw;
		this.#mode = "colon";
	}
	open(entry) {
		if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
		this.#entries.set(this.#key, entry);
		this.#current = entry;
	}
	beginValue(c, at) {
		if (isWhitespace(c)) return;
		if (c === "\"") {
			this.open({
				kind: "string",
				start: at + 1,
				end: -1,
				needsDecoding: false,
				invalidAt: void 0,
				length: void 0,
				text: void 0,
				prefixes: void 0
			});
			this.#escape = false;
			this.#mode = "string";
			return;
		}
		if (c === "}" || c === "," || c === ":" || c === "]") {
			this.fail();
			return;
		}
		this.open({
			kind: "value",
			start: at,
			end: -1,
			parsed: void 0,
			invalid: false
		});
		if (c === "{" || c === "[") {
			this.#mode = "nested";
			this.#nestedEnds = [c === "{" ? "}" : "]"];
			this.#nestedInString = false;
			this.#escape = false;
			return;
		}
		this.#mode = "scalar";
	}
	stepScalar(c, at) {
		if (c !== "," && c !== "}" && !isWhitespace(c)) return;
		this.closeValue(at);
		this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
	}
	stepNested(c, at) {
		if (this.#nestedInString) {
			this.#nestedInString = false;
			return;
		}
		if (c === "\"") {
			this.#nestedInString = true;
			return;
		}
		if (c === "{" || c === "[") {
			this.#nestedEnds.push(c === "{" ? "}" : "]");
			return;
		}
		if (c === "}" || c === "]") {
			if (this.#nestedEnds.pop() !== c) {
				this.fail();
				return;
			}
			if (this.#nestedEnds.length === 0) {
				this.closeValue(at + 1);
				this.#mode = "comma-or-end";
			}
		}
	}
	closeValue(end) {
		const entry = this.#current;
		entry.end = end;
		this.#current = null;
	}
});
/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
/**
* Mark an unreachable closed-union branch.
* @param value - impossible value; an unhandled typed variant fails at the call site.
* @param context - optional switch-site label included in the failure message.
* @returns never; a runtime value that escaped its type always throws.
*/
function assertNever(value, context) {
	const rendered = JSON.stringify(value) ?? String(value);
	throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
/** Whether a realm-owned intrinsic prototype has a native constructor matching this engine's representation. */
function hasIntrinsicConstructor$1(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(name === "Array" ? Array : Object);
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype$1(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor$1(value, "Object");
}
/** Whether an array uses one realm's intrinsic `Array.prototype`, not a subclass or forged prototype. */
function hasPlainArrayPrototype$1(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor$1(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype$1(objectPrototype);
}
/** Whether an object is a plain or null-prototype record from any JavaScript realm. */
function hasPlainObjectPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype$1(prototype);
}
/** Return every JSON-visible object key, or reject own data JSON would discard. */
function enumerableStringKeys(value) {
	const keys = Reflect.ownKeys(value);
	if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
	return keys;
}
/** Validate lossless JSON iteratively, optionally materializing a detached snapshot. */
function walkJsonValue(value, detach) {
	const ancestors = /* @__PURE__ */ new Set();
	let root;
	let parent;
	const assign = (item) => {
		if (parent === void 0) {
			if (detach) root = item;
		} else if (parent.kind === "array") {
			if (parent.target !== void 0) parent.target[parent.key] = item;
		} else if (parent.target !== void 0) Object.defineProperty(parent.target, parent.key, {
			value: item,
			enumerable: true,
			configurable: true,
			writable: true
		});
	};
	const frames = [];
	let current = value;
	for (;;) {
		if (current === null) assign(null);
		else if (typeof current === "boolean" || typeof current === "string") assign(current);
		else if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
			assign(current);
		} else {
			if (typeof current !== "object") return void 0;
			if (ancestors.has(current)) return void 0;
			if (Array.isArray(current)) {
				if (!hasPlainArrayPrototype$1(current)) return void 0;
				const length = current.length;
				if (Reflect.ownKeys(current).length !== length + 1) return void 0;
				const target = detach ? [] : void 0;
				if (target !== void 0) assign(target);
				let indices;
				if (!Number.isInteger(length)) {
					indices = [];
					for (let index = length - 1; index >= 0; index--) indices.push(index);
				}
				frames.push({
					kind: "array",
					source: current,
					length: indices?.length ?? length,
					index: 0,
					key: 0,
					indices,
					target
				});
			} else {
				if (!hasPlainObjectPrototype(current)) return void 0;
				const keys = enumerableStringKeys(current);
				if (keys === void 0) return void 0;
				const target = detach ? {} : void 0;
				if (target !== void 0) assign(target);
				frames.push({
					kind: "object",
					source: current,
					keys,
					index: 0,
					key: "",
					target
				});
			}
			ancestors.add(current);
		}
		for (;;) {
			const frame = frames.at(-1);
			if (frame === void 0) return detach ? root : true;
			const length = frame.kind === "array" ? frame.length : frame.keys.length;
			if (frame.index >= length) {
				ancestors.delete(frame.source);
				frames.pop();
				continue;
			}
			const index = frame.index++;
			parent = frame;
			if (frame.kind === "array") {
				const key = frame.indices === void 0 ? index : frame.indices[frame.indices.length - index - 1];
				/* v8 ignore next -- the loop is bounded by the captured index count. */
				if (key === void 0) return void 0;
				if (!Object.prototype.hasOwnProperty.call(frame.source, key)) return void 0;
				frame.key = key;
				current = frame.source[key];
			} else {
				const key = frame.keys[index];
				/* v8 ignore next -- the loop is bounded by the captured key count. */
				if (key === void 0) return void 0;
				frame.key = key;
				current = frame.source[key];
			}
			break;
		}
	}
}
/**
* Validate and detach lossless JSON in one read per property.
* @param value - candidate value to validate and detach.
* @returns the detached snapshot, or `undefined` when the value is not losslessly JSON-serializable.
*/
function snapshotJsonValue(value) {
	return walkJsonValue(value, true);
}
/**
* Test the same lossless JSON rules as {@link snapshotJsonValue} without detaching the value.
* @param value - candidate value to test.
* @returns whether the value survives a JSON round trip without loss.
*/
function isJsonValue(value) {
	return walkJsonValue(value, false) === true;
}
/**
* Deep-freeze an object graph in place while leaving live AbortSignal objects mutable.
* @param value - value to freeze.
* @returns the same value after every reachable enumerable child is frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
//#endregion
//#region ../../util/timeout/lib/index.js
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../llm/llm/lib/index.js
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = Schema.object({
	initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = Schema.object({
	mode: Schema.const("normal").required(),
	maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = Schema.object({
	mode: Schema.const("always").required(),
	backoff: backoffSchema
});
Schema.union([normalPolicySchema, alwaysPolicySchema]);
const NORMAL_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const ALWAYS_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const BACKOFF_KEYS = new Set([
	"initialDelayMs",
	"maxDelayMs",
	"jitterRatio"
]);
function validateKeys(value, allowed, path) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${path}: unknown key "${key}"`);
}
function resolveBackoff(config, path) {
	if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
	const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
	const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
	if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > 2147483647) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > 2147483647) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
	if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
	return Object.freeze({
		initialDelayMs,
		maxDelayMs,
		jitterRatio
	});
}
/**
* Validate, default, and detach one provider-owned retry policy.
* @param config - optional provider configuration; omission selects normal defaults.
* @param path - diagnostic path naming the provider config that owns the value.
* @returns an immutable policy safe to capture in provider registration state.
*/
function resolveRetryPolicy(config, path) {
	if (config === void 0) return Object.freeze({
		mode: "normal",
		maxRetries: DEFAULT_MAX_RETRIES,
		retryableCodes: DEFAULT_RETRYABLE_CODES,
		...resolveBackoff(void 0, `${path}.backoff`)
	});
	switch (config.mode) {
		case "normal": {
			validateKeys(config, NORMAL_POLICY_KEYS, path);
			const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
			const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
			if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
			if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
			if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
			if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
			return Object.freeze({
				mode: "normal",
				maxRetries,
				retryableCodes: Object.freeze([...retryableCodes]),
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		}
		case "always":
			validateKeys(config, ALWAYS_POLICY_KEYS, path);
			return Object.freeze({
				mode: "always",
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		default: throw new Error(`${path}.mode must be "normal" or "always"`);
	}
}
/**
* Field-wise equality over {@link LlmCallConfig} — the comparison a caller
* runs to decide whether a proposed configuration is a real change (worth a
* logged header snapshot) or the held one restated.
* @param a - one configuration.
* @param b - the other.
* @returns whether every field (including the `stop` list, element-wise) matches.
*/
function callConfigEquals(a, b) {
	if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
	if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
	return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
/**
* Normalization for values thrown by a final LLM adapter boundary.
*
* @module @deepseek-ai/dsh-llm/adapter-failure
*/
/**
* Detach serializable provider facts from a value thrown by an adapter.
* @param value - arbitrary value thrown during adapter dispatch or iteration.
* @returns immutable provider-neutral facts suitable for a terminal finish chunk.
* @internal
*/
function normalizeLlmFailure(value) {
	const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
	const carried = ownFailureSnapshot(error);
	if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
	return Object.freeze({
		message: errorMessage(error),
		code: harnessErrorCode(error)
	});
}
/** Render a non-Error throw without letting hostile coercion escape normalization. */
function thrownMessage(value) {
	try {
		const message = String(value);
		return message.length > 0 ? message : "LLM adapter failed";
	} catch (_hostileThrownValue) {
		return "LLM adapter failed";
	}
}
/** Read a foreign error's own data-backed `code` without invoking accessors. */
function ownErrorCode(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "code");
		return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Snapshot an own data property without invoking an SDK-defined accessor. */
function ownFailureSnapshot(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
		return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Validate and detach an arbitrary serializable failure payload. */
function failureSnapshot(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		const candidate = value;
		const message = candidate.message;
		const code = candidate.code;
		const status = candidate.status;
		const providerRetryAfterMs = candidate.providerRetryAfterMs;
		const requestId = candidate.requestId;
		const offloadImages = candidate.offloadImages;
		if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0) || offloadImages !== void 0 && (!Number.isSafeInteger(offloadImages) || offloadImages <= 0)) return void 0;
		return Object.freeze({
			message,
			code,
			...status === void 0 ? {} : { status },
			...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
			...requestId === void 0 ? {} : { requestId },
			...offloadImages === void 0 ? {} : { offloadImages }
		});
	} catch (_sdkFailureGetter) {
		return;
	}
}
/** Read an SDK error message without letting an accessor replace the primary failure. */
function errorMessage(error) {
	try {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) return message;
	} catch (_sdkMessageGetter) {}
	return "LLM adapter failed";
}
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error) {
	return error instanceof HarnessError ? error.code : "UNKNOWN";
}
function quoted(value) {
	return JSON.stringify(value);
}
/**
* Stable text shown to a model that cannot accept one durable image reference.
* @param ref - durable normalized attachment omitted from the request.
* @returns deterministic text-only placeholder.
*/
function textOnlyImageText(ref) {
	return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
/**
* True when typed model content contains an image block. This is the one image
* walk shared by every image policy (capability gating, text-only
* serialization, compaction survey), so a consumer cannot silently diverge.
* @param content - typed model content blocks.
* @returns whether any block is an image.
*/
function contentHasImage(content) {
	return content.some((block) => block.type === "image");
}
/**
* True when typed model content contains a file block.
* Reads current content on every call without retaining scan results.
* @param content - typed model content blocks.
* @returns whether any block is a file.
*/
function contentHasFile(content) {
	for (const block of content) if (block.type === "file") return true;
	return false;
}
/**
* Stable model-facing handle for one durable file reference: the address of
* the verbatim stored copy and the instruction to read it on demand. This is
* the only representation a provider ever receives for a file.
* @param ref - durable verbatim file reference.
* @param readonlyPath - execution-world path of the stored copy, when resolvable.
* @returns deterministic handle text naming the file, its size, and its address.
*/
function fileHandleText(ref, readonlyPath) {
	const digest = String(ref.attachmentId).slice(7, 15);
	const identity = `File ${quoted(ref.name)} (${ref.bytes} bytes, sha256:${digest})`;
	if (readonlyPath === void 0) return `[${identity} was uploaded, but the current execution environment cannot access a readable path. Report that limitation if its contents are needed; do not claim to have read it.]`;
	return `[${identity}: verbatim read-only copy saved at ${quoted(readonlyPath)}. Read that path with your file tools when its contents are needed; copy it to a writable location before modifying it. When delegating file work, include this saved path in the delegation prompt; only subagents sharing this execution environment can read it.]`;
}
/** Replace every file occurrence with handle text. */
function replaceFilesWithHandles(blocks, resolvePath) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "file") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: fileHandleText(block.attachment, resolvePath(block.attachment))
			});
			continue;
		}
		next?.push(block);
	}
	return next ?? blocks;
}
function projectFilesToText(messages, resolvePath) {
	if (!messages.some((message) => contentHasFile(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceFilesWithHandles(message.content, resolvePath);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
/** Replace every image occurrence for a text-only model. */
function replaceImagesForTextModel(blocks) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "image") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: textOnlyImageText(block.attachment)
			});
			continue;
		}
		next?.push(block);
	}
	return next ?? blocks;
}
function projectImagesForTextModel(messages) {
	if (!messages.some((message) => contentHasImage(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceImagesForTextModel(message.content);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
function withoutDeveloperMessages(messages) {
	const retained = messages.filter((message) => message.role !== "developer");
	return retained.length === messages.length ? messages : retained;
}
function toolDeclarations(history) {
	const declarations = new Map(history.tools.map((tool) => [tool.name, tool]));
	for (const update of history.updates) for (const tool of update.additions) if (!declarations.has(tool.name)) declarations.set(tool.name, {
		...tool,
		deferLoading: true
	});
	return declarations;
}
/** Rebuild declarations on removals or additions to an empty set, where the request prefix changes. */
function rebaseAdditionOnlyHistory(history, messages) {
	const available = new Map(history.tools.map((tool) => [tool.name, tool]));
	let baseline = history.tools;
	let retainedFrom = 0;
	for (const [index, update] of history.updates.entries()) {
		const additions = new Map(update.additions.map((tool) => [tool.name, tool]));
		let reset = available.size === 0 && additions.size > 0;
		for (const block of messages.get(update.messageId)) if (block.type === "tool-addition") {
			const { deferLoading: _loading, ...tool } = additions.get(block.toolName);
			available.set(tool.name, tool);
		} else if (block.type === "tool-removal") {
			reset = true;
			available.delete(block.toolName);
		}
		if (reset) {
			baseline = [...available.values()];
			retainedFrom = index + 1;
		}
	}
	return retainedFrom === 0 ? history : {
		tools: baseline,
		updates: history.updates.slice(retainedFrom)
	};
}
/**
* Construct provider declarations from session-folded history without changing logged active tools.
* Unsupported routes and incomplete history use current declarations without developer updates.
* Explicitly deferred declarations require an addition to activate them.
* A rebuild makes previously activated declarations immediate; unactivated declarations stay deferred.
* Addition-only routes rebuild when a tool is removed or tools are added to an empty set;
* deferred declarations count as existing tools.
* Later additions remain deferred and superseded tool blocks are omitted without dropping other content.
* @param messages - complete request inputs, or the prefix selected for an auxiliary call.
* @param tools - currently active tool schemas.
* @param toolUpdate - the resolved route's update mode.
* @param history - immutable state folded from committed headers and developer messages.
* @returns provider declarations and the corresponding filtered history.
*/
function projectToolUpdates(messages, tools, toolUpdate, history) {
	if (toolUpdate === void 0) {
		let immediateTools = tools;
		if (tools?.some((tool) => tool.deferLoading === true)) immediateTools = tools.map(({ deferLoading: _loading, ...tool }) => tool);
		return {
			messages: withoutDeveloperMessages(messages),
			tools: immediateTools
		};
	}
	if (history === void 0) return {
		messages: withoutDeveloperMessages(messages),
		tools
	};
	const updates = new Map(messages.flatMap((message) => message.role === "developer" ? [[message.id, message.content]] : []));
	if (history.updates.some((update) => !updates.has(update.messageId))) return {
		messages: withoutDeveloperMessages(messages),
		tools
	};
	const projectedHistory = toolUpdate === "addition-only" ? rebaseAdditionOnlyHistory(history, updates) : history;
	const declarations = toolDeclarations(projectedHistory);
	const updateIds = new Set(history.updates.map((update) => update.messageId));
	const retainedUpdateIds = new Set(projectedHistory.updates.map((update) => update.messageId));
	const offered = new Set(projectedHistory.tools.filter((tool) => !tool.deferLoading).map((tool) => tool.name));
	const projectedMessages = [];
	for (const message of messages) {
		if (message.role !== "developer") {
			projectedMessages.push(message);
			continue;
		}
		if (!updateIds.has(message.id)) continue;
		const content = message.content.filter((block) => {
			switch (block.type) {
				case "tool-addition":
					if (!retainedUpdateIds.has(message.id)) return false;
					if (!declarations.has(block.toolName) || offered.has(block.toolName)) return false;
					offered.add(block.toolName);
					return true;
				case "tool-removal":
					if (toolUpdate !== "in-history") return false;
					return offered.delete(block.toolName);
				default: return true;
			}
		});
		if (content.length === 0) continue;
		if (content.length === message.content.length) projectedMessages.push(message);
		else projectedMessages.push({
			...message,
			content
		});
	}
	return {
		messages: projectedMessages.length === messages.length && projectedMessages.every((message, index) => message === messages[index]) ? messages : projectedMessages,
		tools: [...declarations.values()]
	};
}
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `docs/subsystems/llm-streaming.md#appidentity--app-attribution`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = createRequire(import.meta.url)("../package.json");
/**
* LLM service: adapter registry with a waterfall-interceptable streaming call
* API. Exports the `LlmRuntime` default, the abstract `LlmAdapter` for
* provider backends, and `BlockAssembler` for chunk assembly.
*
* @module @deepseek-ai/dsh-llm
*/
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
* Typed error for LLM-related failures. Extends {@link HarnessError}, so the
* `code` string (e.g. `AUTH`, `RATE_LIMIT`, `NO_ADAPTER`) is shared taxonomy.
*/
var LlmError = class extends HarnessError {
	/** Serializable facts retained beside this live Error. */
	failure;
	/**
	* @param message - non-empty human-readable failure summary.
	* @param code - non-empty stable provider-neutral machine code.
	* @param options - optional cause and validated serializable provider facts.
	*/
	constructor(message, code, options) {
		if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
		if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
		if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
		if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
		if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
		super(message, code, options);
		this.name = "LlmError";
		this.failure = Object.freeze({
			message,
			code,
			...options?.status === void 0 ? {} : { status: options.status },
			...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
			...options?.requestId === void 0 ? {} : { requestId: options.requestId },
			...options?.offloadImages === void 0 ? {} : { offloadImages: options.offloadImages }
		});
	}
};
(() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listProviders_decorators;
	let _listConfigurableProviders_decorators;
	let _remoteDiscoverModels_decorators;
	return class LlmRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listProviders_decorators = [Remote];
			_listConfigurableProviders_decorators = [Remote];
			_remoteDiscoverModels_decorators = [Remote("discoverModels")];
			__esDecorate(this, null, _listProviders_decorators, {
				kind: "method",
				name: "listProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listProviders" in obj,
					get: (obj) => obj.listProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listConfigurableProviders_decorators, {
				kind: "method",
				name: "listConfigurableProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConfigurableProviders" in obj,
					get: (obj) => obj.listConfigurableProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteDiscoverModels_decorators, {
				kind: "method",
				name: "remoteDiscoverModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteDiscoverModels" in obj,
					get: (obj) => obj.remoteDiscoverModels
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
		adapters = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		directory = /* @__PURE__ */ new Map();
		discoveries = /* @__PURE__ */ new Map();
		constructor(ctx) {
			super(ctx, "llm");
		}
		/** Notify topology observers without letting one broken listener veto the commit. */
		emitAdaptersUpdated() {
			for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
				const returned = listener();
				if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
					this.warnAdaptersListenerFailure(error);
				});
			} catch (error) {
				this.warnAdaptersListenerFailure(error);
			}
		}
		/** Contained-listener diagnostic shared by the sync and async failure paths. */
		warnAdaptersListenerFailure(error) {
			this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
			this.ctx.logger.warn(error);
		}
		/**
		* Register an adapter for the given provider routes. Throws `LlmError` with code
		* `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
		* Disposed with the fiber.
		* @param providers - every provider route this adapter should serve.
		* @param adapter - the adapter that streams calls for those providers.
		* @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
		*/
		registerAdapter(providers, adapter) {
			const owned = /* @__PURE__ */ new Set();
			let released = false;
			const dispose = this.ctx.effect(function* () {
				if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
				this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
				yield () => {
					released = true;
					for (const provider of owned) this.adapters.delete(provider);
					owned.clear();
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerAdapter()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
				this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
			};
			return handle;
		}
		/**
		* Validate one candidate route set for `adapter`, treating routes this
		* registration already holds as available. Nothing is mutated: a rejected
		* candidate leaves the registry exactly as it was.
		*/
		prepareRoutes(providers, adapter, owned) {
			const unique = /* @__PURE__ */ new Set();
			const registrations = [];
			for (const provider of providers) {
				if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
				if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
				const info = adapter.providerInfo(provider);
				if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
				unique.add(provider);
				const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
				registrations.push({
					adapter,
					provider: {
						id: info.id,
						name: info.name
					},
					retryPolicy
				});
			}
			return registrations;
		}
		/**
		* Swap this registration's routes for the prepared ones in one synchronous
		* section, so no observer can see the registry between the release and the
		* re-registration. The route set's one mutation point is also where
		* `llm/adapters-updated` is published, so a `replace` announces itself
		* exactly like a first registration.
		*/
		commitRoutes(owned, registrations) {
			for (const provider of owned) this.adapters.delete(provider);
			owned.clear();
			for (const registration of registrations) {
				this.adapters.set(registration.provider.id, registration);
				owned.add(registration.provider.id);
			}
			this.emitAdaptersUpdated();
		}
		/**
		* Describe provider routes with a registered adapter.
		* @returns detached provider metadata in registration order.
		*/
		listProviders() {
			return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
		}
		/**
		* Declare provider routes an adapter plugin can activate through
		* configuration. Registration is all-or-nothing: an empty list, invalid
		* entry, or a provider already declared by any registration throws
		* `LlmError` without registering the rest. Disposed with the fiber.
		* @param entries - every configurable provider this plugin owns.
		* @returns a handle that withdraws all of them, and can atomically replace them.
		*/
		registerConfigurableProviders(entries) {
			let held = [];
			let disposed = false;
			/**
			* Validate a candidate set in full against everything this registration
			* does not already hold, then publish it. Nothing is written until the
			* whole set passes, so a refused candidate leaves the current entries in
			* place — the property that makes `replace` a swap rather than a
			* delete-then-add that can strand the directory empty.
			*/
			const commit = (candidates) => {
				const detached = [];
				const own = new Set(held.map((entry) => entry.provider));
				for (const entry of candidates) {
					if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
					if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
					if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
					detached.push(detachDirectoryEntry(entry));
				}
				for (const entry of held) this.directory.delete(entry.provider);
				for (const entry of detached) this.directory.set(entry.provider, entry);
				held = detached;
				this.emitAdaptersUpdated();
			};
			const dispose = this.ctx.effect(function* () {
				if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
				commit(entries);
				yield () => {
					disposed = true;
					for (const entry of held) this.directory.delete(entry.provider);
					held = [];
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerConfigurableProviders()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
				commit(next);
			};
			return handle;
		}
		/**
		* List every declared configurable provider, registered or dormant.
		* @returns detached directory entries in declaration order.
		*/
		listConfigurableProviders() {
			return [...this.directory.values()].map(detachDirectoryEntry);
		}
		/**
		* Offer to interrogate provider endpoints on behalf of the settings
		* namespace this plugin owns. The namespace is the key because that is what
		* a configuration surface already holds from the configurable-provider
		* directory, and because a provider being *added* has no route to name yet.
		* Disposed with the fiber.
		* @param settingsNs - the namespace whose profiles this discovery serves.
		* @param discover - interrogates one endpoint and must honor the supplied signal.
		* @returns the disposer that withdraws the offer.
		*/
		registerModelDiscovery(settingsNs, discover) {
			const dispose = this.ctx.effect(function* () {
				if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
				if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
				this.discoveries.set(settingsNs, discover);
				yield () => {
					this.discoveries.delete(settingsNs);
				};
			}.bind(this), "llm.registerModelDiscovery()");
			return () => void dispose();
		}
		/**
		* Interrogate one provider endpoint for the models it advertises. The
		* request describes a draft, not a stored route, so nothing here reads or
		* writes settings or credentials — the caller owns both, and the reply is
		* candidate metadata a surface may offer for adoption.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - the endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation.
		* @returns the advertised models, deduplicated in endpoint order.
		*/
		async discoverModels(settingsNs, request, signal) {
			const discover = this.discoveries.get(settingsNs);
			if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
			if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
			const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
			const seen = /* @__PURE__ */ new Set();
			const models = [];
			for (const model of discovered) {
				if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
				seen.add(model.id);
				models.push({
					id: model.id,
					...model.name === void 0 ? {} : { name: model.name },
					...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
					...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
					...model.inputModalities === void 0 ? {} : { inputModalities: [...model.inputModalities] }
				});
			}
			return models;
		}
		/**
		* Remote adapter for one draft provider interrogation.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation supplied by the Remote carrier.
		* @returns advertised models in endpoint order.
		* @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
		*/
		async remoteDiscoverModels(settingsNs, request, signal) {
			try {
				return await this.discoverModels(settingsNs, request, signal);
			} catch (error) {
				throw new RemoteError("llm/model-discovery-rejected", error instanceof Error ? error.message : String(error), {
					settingsNs,
					...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
				}, { cause: error });
			}
		}
		/**
		* Resolve the retry policy captured when one provider route was registered.
		* @param provider - registered provider route to inspect.
		* @returns the provider-owned policy, with normal defaults already resolved.
		*/
		providerRetryPolicy(provider) {
			return this.registration(provider).retryPolicy;
		}
		/**
		* Resolve provider-side request-image pricing for one exact route, or
		* `undefined` when the provider is unregistered or declares none. Unknown
		* providers degrade to `undefined` rather than throwing because callers
		* price durable history whose route may no longer be mounted.
		* @param provider - provider route named by a request header.
		* @param model - exact model id named by the same header.
		* @returns the owning adapter's image pricing for the route, when declared.
		*/
		imageRequestPricing(provider, model) {
			return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
		}
		/**
		* Resolve the image projection for an exact registered model route.
		* @param provider - registered provider route.
		* @param model - exact model id.
		* @param image - normalized image reference.
		* @returns dimensions and byte target used by the adapter's request serializer.
		*/
		imageRequestTarget(provider, model, image) {
			return this.registration(provider).adapter.imageRequestTarget(provider, model, image);
		}
		/**
		* Resolve the exact text one durable file occurrence contributes to every
		* provider request in the current execution environment.
		* @param ref - durable verbatim file reference from model history.
		* @returns the same deterministic handle text used at adapter dispatch.
		*/
		fileRequestText(ref) {
			return fileHandleText(ref, this.fileReadPath(ref));
		}
		/** Detach typed adapter-owned modality metadata. */
		detachedModalities(modalities) {
			return modalities === void 0 ? void 0 : [...modalities];
		}
		/**
		* Discover models advertised by one registered provider. Catalog membership
		* does not constrain core routing. Catalog-driven entry points may restrict
		* selection and submission to the advertised models.
		* @param provider - registered provider route to inspect.
		* @returns detached model metadata in adapter-preferred order.
		*/
		async listModels(provider) {
			const models = await this.registration(provider).adapter.listModels(provider);
			const seen = /* @__PURE__ */ new Set();
			return models.map((model) => {
				if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
				seen.add(model.id);
				const inputModalities = this.detachedModalities(model.inputModalities);
				const badge = model.badge;
				return {
					provider: model.provider,
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...inputModalities === void 0 ? {} : { inputModalities },
					...badge === void 0 ? {} : { badge: {
						text: typeof badge.text === "string" ? badge.text : { ...badge.text },
						tone: badge.tone
					} }
				};
			});
		}
		/**
		* Resolve and validate all metadata from the adapter that owns one exact
		* route. The result is detached from adapter-owned objects; catalog
		* membership remains advisory and does not control request routing.
		* @param provider - registered provider route to inspect.
		* @param model - exact model id passed to the adapter.
		* @param signal - optional cancellation for adapter-owned asynchronous lookup.
		* @returns exact model identity plus available context and reasoning metadata.
		*/
		async resolveModelInfo(provider, model, signal) {
			return this.resolveModelInfoFor(this.registration(provider), model, signal);
		}
		async resolveModelInfoFor(registration, model, signal) {
			const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
			return this.normalizeModelInfo(registration, model, resolved);
		}
		/** Validate and detach one adapter-returned exact model result. */
		normalizeModelInfo(registration, model, resolved) {
			const provider = registration.provider.id;
			if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const context = resolved.context;
			if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
			const inputModalities = this.detachedModalities(resolved.inputModalities);
			const systemPromptUpdate = resolved.systemPromptUpdate;
			if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") throw new LlmError(`adapter returned invalid system prompt update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const toolUpdate = resolved.toolUpdate;
			if (toolUpdate !== void 0 && toolUpdate !== "in-history" && toolUpdate !== "addition-only") throw new LlmError(`adapter returned invalid tool update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const defaultMaxTokens = resolved.defaultMaxTokens;
			if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
			const info = {
				provider,
				id: model,
				name: resolved.name,
				...resolved.description === void 0 ? {} : { description: resolved.description },
				...inputModalities === void 0 ? {} : { inputModalities },
				...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
				...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
				...resolved.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: resolved.systemPromptUpdate },
				...resolved.toolUpdate === void 0 ? {} : { toolUpdate: resolved.toolUpdate }
			};
			const reasoning = resolved.reasoning;
			if (reasoning === void 0) return info;
			if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			const seen = /* @__PURE__ */ new Set();
			const efforts = reasoning.efforts.map((effort) => {
				if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
				seen.add(effort.id);
				return {
					id: effort.id,
					name: effort.name,
					...effort.description === void 0 ? {} : { description: effort.description }
				};
			});
			if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			return {
				...info,
				reasoning: {
					efforts,
					...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
				}
			};
		}
		/**
		* Validate a conversation call config against its exact model capability and
		* materialize adapter-configured defaults. Unsupported explicit efforts
		* reject before provider I/O; no clamping or aliasing is performed. This
		* standalone query does not bind a later dispatch; use {@link prepareCall}
		* when logging and streaming must share one adapter registration.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a detached config only when a default must be materialized.
		*/
		async resolveCallConfig(config, signal) {
			return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
		}
		async resolveCallFor(registration, config, signal) {
			const info = await this.resolveModelInfoFor(registration, config.model, signal);
			return this.resolveCallWithInfo(config, info);
		}
		/** Validate request controls against one already-bound exact model result. */
		resolveCallWithInfo(config, info) {
			const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
				...config,
				maxTokens: info.defaultMaxTokens
			} : config;
			const reasoning = info.reasoning;
			const requested = defaulted.reasoningEffort;
			let resolvedConfig = defaulted;
			if (reasoning === void 0) {
				if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
			} else {
				const effective = requested ?? reasoning.defaultEffort;
				if (effective !== void 0) {
					if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
					if (requested !== effective) resolvedConfig = {
						...defaulted,
						reasoningEffort: effective
					};
				}
			}
			return {
				config: resolvedConfig,
				...info.context === void 0 ? {} : { context: info.context },
				modelInfo: info
			};
		}
		/**
		* Resolve one call under its current adapter registration. The returned
		* one-shot handle keeps that registration across header logging and dispatch,
		* so HMR cannot combine one adapter's capability result with another adapter.
		* An optional synchronous callback selects concrete controls using captured
		* model metadata. Defaults and validation apply to its result. Callback
		* failures and cancellation reject preparation before dispatch.
		* @param config - provider/model route and optional concrete request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @param configure - pure control selection, called once before defaults and validation.
		* @returns a prepared config and its registration-bound stream entry point.
		*/
		async prepareCall(config, signal, configure) {
			signal?.throwIfAborted();
			const { provider, model, ...controls } = config;
			const registration = this.registration(provider);
			const adapterCall = await registration.adapter.prepareCall(provider, model, signal);
			signal?.throwIfAborted();
			const modelInfo = this.normalizeModelInfo(registration, model, adapterCall.model);
			const proposed = configure === void 0 ? config : {
				...configure(deepFreeze(structuredClone(controls)), deepFreeze(modelInfo)),
				provider,
				model
			};
			signal?.throwIfAborted();
			const resolved = this.resolveCallWithInfo(proposed, modelInfo);
			const resolvedConfig = deepFreeze(structuredClone(resolved.config));
			const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
			const adapterDefaults = deepFreeze({
				...proposed.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
				...proposed.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
			});
			let dispatched = false;
			return Object.freeze({
				config: resolvedConfig,
				retryPolicy: registration.retryPolicy,
				adapterDefaults,
				...context === void 0 ? {} : { context },
				...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
				...modelInfo.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: modelInfo.systemPromptUpdate },
				...modelInfo.toolUpdate === void 0 ? {} : { toolUpdate: modelInfo.toolUpdate },
				stream: (options) => {
					if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
					if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
					dispatched = true;
					return this.streamWithRegistration(options, {
						registration,
						config: resolvedConfig,
						modelInfo,
						dispatch: (options) => adapterCall.stream(options)
					});
				}
			});
		}
		registration(provider) {
			const registration = this.adapters.get(provider);
			if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
			return registration;
		}
		/** Remove replay state whose historical route is owned by another adapter. */
		forAdapter(options, adapter) {
			const messages = options.messages.map((message) => {
				if (message.role !== "assistant") return message;
				const source = message.source;
				if (source.replayState === void 0) return message;
				if (this.adapters.get(source.provider)?.adapter === adapter) return message;
				return freezeMessage({
					...message,
					source: {
						kind: "model",
						provider: source.provider,
						model: source.model
					}
				});
			});
			if (messages.every((message, index) => message === options.messages[index])) return options;
			const filtered = {
				...options,
				messages
			};
			return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
		}
		/**
		* Resolve the current execution-world read path of one durable file
		* reference through the mounted attachment and filesystem providers.
		*/
		fileReadPath(ref) {
			let hostPath;
			try {
				hostPath = this.ctx.get("attachments")?.fileHostPath(ref);
			} catch {
				return;
			}
			if (hostPath === void 0) return void 0;
			return this.ctx.get("fs")?.processPathFromHostPath(hostPath);
		}
		/**
		* Final adapter boundary. Adapter selection, dispatch, iterator construction,
		* and iteration failures become one terminal failure chunk. Middleware and
		* downstream consumer failures remain thrown plugin or consumer errors.
		*/
		async *adapterStream(options, prepared) {
			let iterator;
			try {
				const registration = prepared?.registration ?? this.registration(options.provider);
				const adapter = registration.adapter;
				let modelInfo;
				let resolvedConfig;
				let dispatch;
				if (prepared === void 0) {
					const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
					modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
					resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
					dispatch = (options) => adapterCall.stream(options);
				} else {
					modelInfo = prepared.modelInfo;
					resolvedConfig = prepared.config;
					dispatch = prepared.dispatch;
				}
				if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
				const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
					...options,
					...resolvedConfig
				}) : {
					...options,
					...resolvedConfig
				};
				let projectedMessages = resolvedOptions.messages;
				if (projectedMessages.some((message) => contentHasFile(message.content))) projectedMessages = projectFilesToText(projectedMessages, (ref) => this.fileReadPath(ref));
				if (modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && projectedMessages.some((message) => contentHasImage(message.content))) projectedMessages = projectImagesForTextModel(projectedMessages);
				const projectedTools = projectToolUpdates(projectedMessages, resolvedOptions.tools, modelInfo.toolUpdate, resolvedOptions.toolHistory);
				projectedMessages = projectedTools.messages;
				let projectedOptions = resolvedOptions;
				if (projectedMessages !== resolvedOptions.messages || projectedTools.tools !== resolvedOptions.tools) {
					projectedOptions = {
						...resolvedOptions,
						messages: projectedMessages,
						...projectedTools.tools === void 0 ? {} : { tools: projectedTools.tools }
					};
					if (Object.isFrozen(resolvedOptions)) deepFreeze(projectedOptions);
				}
				iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
			} catch (error) {
				yield adapterFailureChunk(error, options.signal);
				return;
			}
			let completed = false;
			try {
				while (true) {
					let item;
					try {
						const next = await iterator.next();
						item = next.done ? { done: true } : {
							done: false,
							value: next.value
						};
					} catch (error) {
						completed = true;
						yield adapterFailureChunk(error, options.signal);
						return;
					}
					if (item.done) {
						completed = true;
						return;
					}
					yield item.value;
				}
			} finally {
				if (!completed) {
					const close = iterator.return?.bind(iterator);
					if (close) await close();
				}
			}
		}
		/**
		* Stream one model call as raw chunks (token-level deltas). Replay state is
		* retained only when the same adapter instance owns its historical provider
		* and the target provider. Final adapter selection remains fixed through
		* asynchronous exact-model resolution and dispatch. Adapter selection,
		* dispatch, and iteration failures become terminal `error` or `aborted`
		* finish chunks; middleware, nested-call, cleanup, and consumer failures
		* remain thrown.
		* @param options - the full request; `options.provider` selects the adapter.
		* @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
		*/
		stream(options) {
			return this.streamWithRegistration(options);
		}
		streamWithRegistration(options, prepared) {
			return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
		}
	};
})();
/** Convert one adapter throw into the stream protocol's terminal outcome. */
function adapterFailureChunk(error, signal) {
	const failure = normalizeLlmFailure(error);
	return {
		type: "finish",
		reason: signal?.aborted || failure.code === "ABORTED" ? {
			kind: "aborted",
			failure
		} : {
			kind: "error",
			failure
		}
	};
}
/** Copy a directory entry, including its arrays, so neither side can mutate the other's copy. */
function detachDirectoryEntry(entry) {
	const { nativeAuth } = entry;
	return {
		...entry,
		settingsPath: [...entry.settingsPath],
		...entry.baseURLEnv === void 0 ? {} : { baseURLEnv: [...entry.baseURLEnv] },
		...nativeAuth === void 0 ? {} : { nativeAuth: {
			...nativeAuth,
			env: [...nativeAuth.env]
		} }
	};
}
//#endregion
//#region ../../core/tools/lib/shared-DTdn5dXO.js
/** The selected provider is missing or unloaded; another provider must not take its calls. */
var ToolExecutorUnavailableError = class extends HarnessError {
	constructor() {
		super("The selected tool executor is unavailable. Load an executor in this composition before running the agent.", "TOOL_EXECUTOR_UNAVAILABLE");
		this.name = "ToolExecutorUnavailableError";
	}
};
/**
* Enforced JSON Schema subset shared by tool outputs, generated PTC mode
* types, subagents, and workflows. The subset accepts any JSON root, an
* annotation-only schema for unconstrained JSON, one scalar `type`, object
* `properties`/`required`/boolean `additionalProperties`, array `items`,
* type-correct scalar `enum`/`const`, and exact-one `oneOf`.
*
* Unsupported or misplaced keywords reject rather than being accepted without
* enforcement. Consumers that require an object root apply
* {@link assertObjectJsonSchema} before accepting input.
* @module dsh-tools/json-schema
*/
/**
* Thrown when a raw schema falls outside the enforced subset. `violations`
* lists every offending path instead of stopping at the first author error.
*/
var JsonSchemaError = class extends HarnessError {
	/** Individual schema violations in walk order. */
	violations;
	constructor(violations) {
		super(`unsupported JSON schema: ${violations.join("; ")}`, "UNSUPPORTED_SCHEMA");
		this.name = "JsonSchemaError";
		this.violations = violations;
	}
};
const CONSTRAINT_KEYWORDS = new Set([
	"type",
	"oneOf",
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
]);
const ANNOTATION_KEYWORDS = new Set([
	"description",
	"title",
	"default",
	"examples"
]);
const SCHEMA_TYPES = [
	"object",
	"array",
	"string",
	"number",
	"integer",
	"boolean",
	"null"
];
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
/**
* Test for a realm-agnostic plain JSON record without accepting arrays or
* exotic objects.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the value has a plain-object prototype chain.
*/
function isPlainJsonRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
	} catch {
		return false;
	}
}
/** Whether an array uses one realm's intrinsic `Array.prototype`. */
function hasPlainArrayPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
/** Return whether a record contains only own enumerable string keys. */
function hasOnlyEnumerableStringKeys(value) {
	try {
		return Reflect.ownKeys(value).every((key) => typeof key === "string" && Object.prototype.propertyIsEnumerable.call(value, key));
	} catch {
		return false;
	}
}
/**
* Test for an ordinary schema record whose keys survive JSON projection.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the record has an intrinsic prototype and only own enumerable string keys.
*/
function isJsonSchemaRecord(value) {
	return isPlainJsonRecord(value) && hasOnlyEnumerableStringKeys(value);
}
/**
* Test for a dense ordinary array with no JSON-invisible decorations.
* @param value - candidate array from any JavaScript realm.
* @returns Whether the array is intrinsic, dense, and undecorated.
*/
function isPlainJsonArray(value) {
	if (!Array.isArray(value)) return false;
	try {
		if (!hasPlainArrayPrototype(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
		for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
		return true;
	} catch {
		return false;
	}
}
/** Lossless finite JSON number, excluding negative zero. */
function isJsonNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
}
/** Whether a scalar is valid for one declared schema type. */
function scalarMatches(type, value) {
	switch (type) {
		case "string": return typeof value === "string";
		case "number": return isJsonNumber(value);
		case "integer": return isJsonNumber(value) && Number.isInteger(value);
		case "boolean": return typeof value === "boolean";
		case "null": return value === null;
		/* v8 ignore next -- JsonSchemaScalarType is closed; this retains compile-time exhaustiveness. */
		default: return assertNever(type, "JsonSchemaType");
	}
}
/** Keywords that are invalid beside `oneOf`. */
const ONE_OF_SIBLING_KEYWORDS = [
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
];
/** Validate object-only fields after its property schemas have been visited. */
function checkObjectSchemaTail(node, path, properties, violations) {
	const hasRequired = Object.hasOwn(node, "required");
	const required = hasRequired ? node.required : void 0;
	if (hasRequired) if (!isPlainJsonArray(required) || required.some((entry) => typeof entry !== "string")) violations.push(`${path}.required must be an array of strings`);
	else {
		const declared = isJsonSchemaRecord(properties) ? properties : {};
		for (const key of required) if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`);
	}
	if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") violations.push(`${path}.additionalProperties must be a boolean`);
}
/** Collect every violation for one raw schema tree without using the JavaScript call stack. */
function checkSchemaNode(root, rootPath, violations, seen) {
	const tasks = [{
		kind: "enter",
		node: root,
		path: rootPath
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.node);
			continue;
		}
		if (task.kind === "one-of-tail") {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(task.node, key)) violations.push(`${task.path}.${key} is not supported beside oneOf`);
			continue;
		}
		if (task.kind === "object-tail") {
			checkObjectSchemaTail(task.node, task.path, task.properties, violations);
			continue;
		}
		const { node, path } = task;
		if (!isJsonSchemaRecord(node)) {
			violations.push(`${path} must be a schema object`);
			continue;
		}
		if (seen.has(node)) {
			violations.push(`${path} is circular`);
			continue;
		}
		seen.add(node);
		tasks.push({
			kind: "leave",
			node
		});
		for (const key of Object.keys(node)) {
			if (CONSTRAINT_KEYWORDS.has(key)) continue;
			if (ANNOTATION_KEYWORDS.has(key)) {
				try {
					if (!isJsonValue(node[key])) violations.push(`${path}.${key} annotation must be lossless JSON data`);
				} catch {
					violations.push(`${path}.${key} annotation must be lossless JSON data`);
				}
				continue;
			}
			violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`);
		}
		if (Object.hasOwn(node, "description") && typeof node.description !== "string") violations.push(`${path}.description must be a string`);
		if (Object.hasOwn(node, "title") && typeof node.title !== "string") violations.push(`${path}.title must be a string`);
		const hasType = Object.hasOwn(node, "type");
		const hasOneOf = Object.hasOwn(node, "oneOf");
		if (hasType && hasOneOf) {
			violations.push(`${path} cannot declare both type and oneOf`);
			continue;
		}
		if (!hasType && !hasOneOf) {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} requires type or oneOf`);
			continue;
		}
		if (hasOneOf) {
			const oneOf = node.oneOf;
			tasks.push({
				kind: "one-of-tail",
				node,
				path
			});
			if (!isPlainJsonArray(oneOf) || oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`);
			else for (let index = oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "enter",
				node: oneOf[index],
				path: `${path}.oneOf[${index}]`
			});
			continue;
		}
		const type = node.type;
		if (typeof type !== "string" || !SCHEMA_TYPES.includes(type)) {
			violations.push(Array.isArray(type) ? `${path}.type must be a single type string (type arrays are not supported)` : `${path}.type must be one of ${SCHEMA_TYPES.join("/")}`);
			continue;
		}
		const schemaType = type;
		for (const [key, types] of Object.entries({
			properties: ["object"],
			required: ["object"],
			additionalProperties: ["object"],
			items: ["array"],
			enum: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			],
			const: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			]
		})) if (Object.hasOwn(node, key) && !types.includes(schemaType)) violations.push(`${path}.${key} is not supported on type "${schemaType}"`);
		switch (schemaType) {
			case "object": {
				const properties = Object.hasOwn(node, "properties") ? node.properties : void 0;
				tasks.push({
					kind: "object-tail",
					node,
					path,
					properties
				});
				if (Object.hasOwn(node, "properties")) if (!isJsonSchemaRecord(properties)) violations.push(`${path}.properties must be an object of schemas`);
				else {
					const entries = Object.entries(properties);
					for (let index = entries.length - 1; index >= 0; index--) {
						const entry = entries[index];
						/* v8 ignore next -- the loop is bounded by the captured entry count. */
						if (entry === void 0) continue;
						tasks.push({
							kind: "enter",
							node: entry[1],
							path: `${path}.properties.${entry[0]}`
						});
					}
				}
				break;
			}
			case "array":
				if (Object.hasOwn(node, "items")) tasks.push({
					kind: "enter",
					node: node.items,
					path: `${path}.items`
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null": {
				const hasEnum = Object.hasOwn(node, "enum");
				const allowed = hasEnum ? node.enum : void 0;
				const enumValid = isPlainJsonArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(schemaType, entry));
				if (hasEnum && !enumValid) violations.push(`${path}.enum must be a non-empty array of ${schemaType} values`);
				const hasConst = Object.hasOwn(node, "const");
				const declaredConst = hasConst ? node.const : void 0;
				const constValid = scalarMatches(schemaType, declaredConst);
				if (hasConst) {
					if (!constValid) violations.push(`${path}.const must be a ${schemaType} value`);
					else if (enumValid && !allowed.includes(declaredConst)) violations.push(`${path}.const must be one of ${path}.enum when both are declared`);
				}
				break;
			}
			/* v8 ignore next -- schemaType was narrowed from the closed SCHEMA_TYPES table above. */
			default: assertNever(schemaType, "JsonSchemaType");
		}
	}
}
/**
* Assert that an arbitrary raw schema uses only the enforced subset.
* Annotation-only schemas are accepted as the standard unconstrained-JSON
* form; callers that require an object root use {@link assertObjectJsonSchema}.
* @param schema - untrusted raw JSON Schema.
* @returns Assertion that the schema belongs to the supported subset.
*/
function assertSupportedJsonSchema(schema) {
	const violations = [];
	checkSchemaNode(schema, "schema", violations, /* @__PURE__ */ new Set());
	if (violations.length > 0) throw new JsonSchemaError(violations);
}
/** Safely test the lossless JSON boundary when a getter may throw. */
function safelyIsJsonValue(value) {
	try {
		return isJsonValue(value);
	} catch {
		return false;
	}
}
/** Root-aware diagnostic path for the parameter validator's empty sentinel. */
function diagnosticPath(path) {
	return path === "" ? "arguments" : path;
}
/** Append one object property without a leading dot at an implicit root. */
function propertyPath(path, key) {
	return path === "" ? key : `${path}.${key}`;
}
/** The generic exception-containment diagnostic owned by one valid schema node. */
function losslessValueViolation(path) {
	return [`"${diagnosticPath(path)}" must be a lossless JSON value`];
}
/** Append diagnostics without spreading a potentially wide child result as call arguments. */
function appendViolations(target, source) {
	for (const violation of source) target.push(violation);
}
/** Initialize one validation frame with empty aggregation state. */
function valueFrame(node, value, path) {
	return {
		node,
		value,
		path,
		catches: false,
		phase: "start",
		children: [],
		childIndex: 0,
		violations: [],
		tailViolations: [],
		matches: 0
	};
}
/** Validate one scalar node after its primitive type check. */
function checkScalarValue(node, value, path) {
	const allowed = Object.hasOwn(node, "enum") ? node.enum : void 0;
	if (allowed !== void 0 && !allowed.includes(value)) return [`"${diagnosticPath(path)}" must be one of ${JSON.stringify(allowed)}`];
	if (Object.hasOwn(node, "const") && value !== node.const) return [`"${diagnosticPath(path)}" must be ${JSON.stringify(node.const)}`];
	return [];
}
/** Validate one trusted schema/value pair with explicit frames rather than recursive calls. */
function checkValue(schema, value, path) {
	const frames = [valueFrame(schema, value, path)];
	let rootResult;
	const receive = (result) => {
		const parent = frames.at(-1);
		if (parent === void 0) {
			rootResult = result;
			return;
		}
		if (parent.kind === "oneOf") {
			if (result.length === 0) parent.matches++;
		} else appendViolations(parent.violations, result);
	};
	const finish = (result) => {
		frames.pop();
		receive(result);
	};
	while (frames.length > 0) {
		const frame = frames.at(-1);
		/* v8 ignore next -- the loop condition guarantees a current frame. */
		if (frame === void 0) break;
		try {
			if (frame.phase === "children") {
				if (frame.childIndex < frame.children.length) {
					const child = frame.children[frame.childIndex];
					/* v8 ignore next -- childIndex is bounded by children.length. */
					if (child === void 0) throw new Error("missing schema-value child frame");
					frame.childIndex++;
					frames.push(valueFrame(child.node, child.value, child.path));
					continue;
				}
				if (frame.kind === "oneOf") {
					finish(frame.matches === 1 ? [] : [`"${diagnosticPath(frame.path)}" must match exactly one oneOf branch (matched ${frame.matches})`]);
					continue;
				}
				appendViolations(frame.violations, frame.tailViolations);
				if (frame.violations.length > 0) finish(frame.violations);
				else if (frame.kind === "object") finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a lossless JSON object`]);
				else finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a dense lossless JSON array`]);
				continue;
			}
			const nodeType = Object.hasOwn(frame.node, "type") ? frame.node.type : void 0;
			frame.catches = !(nodeType !== void 0 && !SCHEMA_TYPES.includes(nodeType));
			const oneOf = Object.hasOwn(frame.node, "oneOf") ? frame.node.oneOf : void 0;
			if (oneOf !== void 0) {
				frame.kind = "oneOf";
				frame.children = Array.from(oneOf, (branch) => ({
					node: branch,
					value: frame.value,
					path: frame.path
				}));
				frame.childIndex = 0;
				frame.matches = 0;
				frame.phase = "children";
				continue;
			}
			if (nodeType === void 0) {
				finish(safelyIsJsonValue(frame.value) ? [] : losslessValueViolation(frame.path));
				continue;
			}
			switch (nodeType) {
				case "object": {
					if (!isPlainJsonRecord(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an object`]);
						break;
					}
					const properties = Object.hasOwn(frame.node, "properties") ? frame.node.properties ?? {} : {};
					const violations = [];
					const required = Object.hasOwn(frame.node, "required") ? frame.node.required ?? [] : [];
					for (const key of required) if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) violations.push(`missing required property "${propertyPath(frame.path, key)}"`);
					const children = [];
					for (const [key, child] of Object.entries(properties)) {
						if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) continue;
						children.push({
							node: child,
							value: frame.value[key],
							path: propertyPath(frame.path, key)
						});
					}
					const tailViolations = [];
					if (Object.hasOwn(frame.node, "additionalProperties") && frame.node.additionalProperties === false) {
						for (const key of Object.keys(frame.value)) if (!Object.hasOwn(properties, key)) tailViolations.push(`"${propertyPath(frame.path, key)}" is not a declared property (additionalProperties: false)`);
					}
					frame.kind = "object";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = violations;
					frame.tailViolations = tailViolations;
					frame.phase = "children";
					break;
				}
				case "array": {
					if (!Array.isArray(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an array`]);
						break;
					}
					const items = Object.hasOwn(frame.node, "items") ? frame.node.items : void 0;
					const children = items === void 0 ? [] : frame.value.flatMap((entry, index) => [{
						node: items,
						value: entry,
						path: `${frame.path}[${index}]`
					}]);
					frame.kind = "array";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = [];
					frame.phase = "children";
					break;
				}
				case "string":
					finish(typeof frame.value === "string" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a string`]);
					break;
				case "number":
					finish(typeof frame.value !== "number" ? [`"${diagnosticPath(frame.path)}" must be a number`] : !isJsonNumber(frame.value) ? [`"${diagnosticPath(frame.path)}" must be a finite JSON number`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "integer":
					finish(!isJsonNumber(frame.value) || !Number.isInteger(frame.value) ? [`"${diagnosticPath(frame.path)}" must be an integer`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "boolean":
					finish(typeof frame.value === "boolean" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a boolean`]);
					break;
				case "null":
					finish(frame.value === null ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be null`]);
					break;
				default: finish(assertNever(nodeType, "JsonSchemaType"));
			}
		} catch (error) {
			let failed = frames.pop();
			while (failed !== void 0 && !failed.catches) failed = frames.pop();
			if (failed === void 0) throw error;
			receive(losslessValueViolation(failed.path));
		}
	}
	/* v8 ignore next -- every root frame finishes or throws. */
	return rootResult ?? losslessValueViolation(path);
}
/**
* Validate a candidate value against an asserted raw schema. The function is
* total for arbitrary values and returns path-qualified violations.
* @param schema - a schema accepted by {@link assertSupportedJsonSchema}.
* @param value - the candidate JSON value.
* @param path - root label used in diagnostics.
* @returns All violations in walk order; empty means valid.
*/
function validateJsonSchemaValue(schema, value, path = "value") {
	return checkValue(schema, value, path);
}
/** Tool definitions and invocation data shared by registries and executors. @module */
/** Reserved model-facing program transport name. */
const RUN_CODE_NAME = "run_code";
/** Failure to determine a tool's step-time availability. */
var ToolActivationError = class extends HarnessError {
	/**
	* Preserve a condition failure without treating it as normal unavailability.
	* @param name - tool whose condition rejected.
	* @param cause - underlying condition failure.
	*/
	constructor(name, cause) {
		super(`cannot resolve availability of tool "${name}"`, "TOOL_ACTIVATION_FAILED", { cause });
		this.name = "ToolActivationError";
	}
};
//#endregion
//#region ../../core/scope/lib/index.js
/**
* Shared insertion-ordered storage and effect ownership for scope-aware registries.
*
* @module @deepseek-ai/dsh-scope
*/
/**
* Insertion-ordered named entries with caller-owned duplicate diagnostics.
*
* Values are borrowed. Iterators are live within one nonempty table
* generation; draining the table detaches them from later insertions. Each
* successful insertion returns an idempotent undo for that exact entry.
*/
var NamedEntries = class {
	duplicateError;
	data = /* @__PURE__ */ new Map();
	constructor(duplicateError) {
		this.duplicateError = duplicateError;
	}
	/**
	* Insert one unique name.
	* @param name - name unique within this table.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo that removes only this insertion.
	*/
	insert(name, value) {
		const data = this.data;
		if (data.has(name)) throw this.duplicateError(name);
		data.set(name, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(name);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Read one named value.
	* @param name - name to resolve.
	* @returns the retained value, or `undefined` when absent.
	*/
	get(name) {
		return this.data.get(name);
	}
	/**
	* Test one name for membership.
	* @param name - name to test.
	* @returns whether the table contains that name.
	*/
	has(name) {
		return this.data.has(name);
	}
	/**
	* Iterate live names in insertion order.
	* @returns the native live key iterator.
	*/
	keys() {
		return this.data.keys();
	}
	/**
	* Iterate live entries in insertion order.
	* @returns the native live entry iterator.
	*/
	entries() {
		return this.data.entries();
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Insertion-ordered anonymous entries with independent registration identity.
*
* Equal values remain separate registrations. Values are borrowed, and
* iterators are live within one nonempty table generation; draining the table
* detaches them from later appends.
*/
var AnonymousEntries = class {
	data = /* @__PURE__ */ new Map();
	/**
	* Append one independently owned value.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo for this exact append.
	*/
	append(value) {
		const data = this.data;
		const key = Symbol();
		data.set(key, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(key);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Own the global and exact-scope layers for one registry.
*
* Reads never create scoped layers. Registrations derive both visibility and
* effect ownership from the supplied Cordis context, collect undo before
* notification, and reclaim only a completely empty aggregate layer.
*/
var ScopedLayers = class {
	createLayer;
	onChange;
	/** The eagerly constructed context-global layer. */
	global;
	scoped = /* @__PURE__ */ new Map();
	constructor(createLayer, onChange) {
		this.createLayer = createLayer;
		this.onChange = onChange;
		this.global = createLayer(void 0);
	}
	/**
	* Read an existing exact-scope overlay. Deliberately chain-blind: callers
	* addressing one scope's OWN contributions (its restrictions, its guards)
	* must not silently pick up an ancestor's — use {@link chainLayers} where
	* inheritance is the point.
	* @param scope - exact scope key; `undefined` denotes no overlay.
	* @returns the existing scoped layer, or `undefined` without creating one.
	*/
	peek(scope) {
		if (scope === void 0) return void 0;
		return this.scoped.get(scope);
	}
	/**
	* Existing overlays along the scope's parent chain ({@link scopeChainOf}),
	* farthest ancestor first and the exact scope last, so a caller layering
	* them in order gives the nearest scope the final word.
	* @param scope - viewing scope, or `undefined` for no overlays.
	* @returns the existing layers, nearest last; absent overlays are skipped.
	*/
	chainLayers(scope) {
		const layers = [];
		for (const key of scopeChainOf(scope).reverse()) {
			const layer = this.scoped.get(key);
			if (layer !== void 0) layers.push(layer);
		}
		return layers;
	}
	/**
	* Materialize global named entries followed by scope-chain shadows,
	* farthest ancestor first, so the nearest scope's entry wins a name.
	* @param scope - viewing scope, or `undefined` for the global view.
	* @param pick - select the named table from a layer.
	* @returns an insertion-ordered effective map.
	*/
	merge(scope, pick) {
		const merged = new Map(pick(this.global).entries());
		for (const layer of this.chainLayers(scope)) for (const [name, value] of pick(layer).entries()) merged.set(name, value);
		return merged;
	}
	/**
	* Attach one synchronous layer mutation to its registration context.
	* @param ctx - context that determines both scope visibility and effect ownership.
	* @param action - atomic mutation returning its synchronous undo.
	* @param options - Cordis effect label and optional change notification.
	* @returns the exact disposer returned by `ctx.effect()`.
	*/
	effect(ctx, action, options) {
		const scope = scopeOf(ctx);
		const notify = options.notify ?? true;
		return ctx.effect(function* () {
			let layer;
			let created = false;
			if (scope === void 0) layer = this.global;
			else {
				const existing = this.scoped.get(scope);
				if (existing === void 0) {
					layer = this.createLayer(scope);
					this.scoped.set(scope, layer);
					created = true;
				} else layer = existing;
			}
			let undo;
			try {
				undo = action(layer);
			} catch (error) {
				if (scope !== void 0 && created && layer.isEmpty()) this.scoped.delete(scope);
				throw error;
			}
			yield () => {
				undo();
				if (scope !== void 0 && layer.isEmpty()) this.scoped.delete(scope);
				if (notify) this.onChange();
			};
			if (notify) this.onChange();
		}.bind(this), options.label);
	}
};
/**
* Scoped-context primitive: mint a Cordis context that tags registrations with
* an opaque identity and build routing-only event carriers for that identity.
*
* @module @deepseek-ai/dsh-scope
*/
/** Context tag written by {@link createScope}. */
const kScope = Symbol("dsh.scope");
/**
* The enclosing scope of each key. One relation powers both directions of
* scope nesting: registration views inherit DOWN the chain (a child scope
* sees its ancestors' layers — {@link ScopedLayers}), and event admission
* extends UP it (a listener tagged with an ancestor receives events dispatched
* to a descendant key — {@link scopeTarget}).
*/
const scopeParents = /* @__PURE__ */ new WeakMap();
/**
* The chain from a key to its root ancestor.
* @param key - the starting key, or `undefined` for the empty chain.
* @returns keys nearest-first: `[key, parent, grandparent, …]`.
*/
function scopeChainOf(key) {
	const chain = [];
	for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) chain.push(cursor);
	return chain;
}
/**
* Read the nearest scope tag inherited by a context.
* @param ctx - context to inspect.
* @returns its scope key, or `undefined` for an unscoped context.
*/
function scopeOf(ctx) {
	return ctx[kScope];
}
//#endregion
//#region ../../core/tools/lib/index.js
/** Unified JSON-value schema DSL, inference, compilation, and tool definition helpers. @module dsh-tools/schema */
const ANNOTATION_KEYS = [
	"description",
	"title",
	"default",
	"examples"
];
/** Throw one author-schema violation through the shared schema error type. */
function authorError(message) {
	throw new JsonSchemaError([message]);
}
/** Copy own annotation fields for validation by the raw-schema boundary. */
function copyAnnotations(source, target) {
	if (Object.hasOwn(source, "description")) target.description = source.description;
	if (Object.hasOwn(source, "title")) target.title = source.title;
	if (Object.hasOwn(source, "default")) target.default = source.default;
	if (Object.hasOwn(source, "examples")) target.examples = source.examples;
}
/** Reject author-only keys outside one node's declared vocabulary. */
function assertAuthorKeys(source, path, allowed) {
	for (const key of Object.keys(source)) if (!allowed.includes(key)) authorError(`${path}.${key} is not supported by the value schema DSL`);
}
/** Install a compiled node without giving `__proto__` assignment semantics. */
function assignCompiledNode(destination, node) {
	switch (destination.kind) {
		case "root":
			destination.holder.value = node;
			break;
		case "property":
			Object.defineProperty(destination.target, destination.key, {
				value: node,
				enumerable: true,
				configurable: true,
				writable: true
			});
			break;
		case "item":
			destination.target.items = node;
			break;
		case "one-of":
			destination.target[destination.index] = node;
			break;
	}
}
/** Install a compiled property map at its root or containing object node. */
function assignCompiledPropertyMap(destination, compiled) {
	if (destination.kind === "root") destination.holder.value = compiled;
	else destination.target.properties = compiled.properties;
}
/** Execute an author-schema compilation task graph without recursive descent. */
function runSchemaCompiler(initial) {
	const seen = /* @__PURE__ */ new Set();
	const tasks = [initial];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.input);
			continue;
		}
		if (task.kind === "property-map-tail") {
			if (task.required.length > 0) {
				task.compiled.required = task.required;
				if (task.destination.kind === "object") task.destination.target.required = task.required;
			}
			continue;
		}
		if (task.kind === "property") {
			if (!isJsonSchemaRecord(task.property)) authorError(`${task.path} must be a value schema object`);
			if (Object.hasOwn(task.property, "required") && task.property.required !== true) authorError(`${task.path}.required must be true when present`);
			if (Object.hasOwn(task.property, "required") && task.property.required === true) task.required.push(task.key);
			tasks.push({
				kind: "value",
				input: task.property,
				path: task.path,
				allowRequired: true,
				destination: {
					kind: "property",
					target: task.properties,
					key: task.key
				}
			});
			continue;
		}
		if (task.kind === "property-map") {
			if (!isJsonSchemaRecord(task.input)) authorError(`${task.path} must be an object of value schemas`);
			if (seen.has(task.input)) authorError(`${task.path} is circular`);
			seen.add(task.input);
			const compiled = { properties: {} };
			const required = [];
			assignCompiledPropertyMap(task.destination, compiled);
			tasks.push({
				kind: "leave",
				input: task.input
			});
			tasks.push({
				kind: "property-map-tail",
				compiled,
				required,
				destination: task.destination
			});
			const entries = Object.entries(task.input);
			for (let index = entries.length - 1; index >= 0; index--) {
				const entry = entries[index];
				/* v8 ignore next -- the loop is bounded by the captured entry count. */
				if (entry === void 0) continue;
				tasks.push({
					kind: "property",
					property: entry[1],
					path: `${task.path}.${entry[0]}`,
					key: entry[0],
					properties: compiled.properties,
					required
				});
			}
			continue;
		}
		const { input, path } = task;
		if (!isJsonSchemaRecord(input)) authorError(`${path} must be a value schema object`);
		if (seen.has(input)) authorError(`${path} is circular`);
		seen.add(input);
		const authorKeys = [...ANNOTATION_KEYS, ...task.allowRequired ? ["required"] : []];
		const node = {};
		assignCompiledNode(task.destination, node);
		tasks.push({
			kind: "leave",
			input
		});
		if (Object.hasOwn(input, "oneOf")) {
			assertAuthorKeys(input, path, [
				...authorKeys,
				"oneOf",
				"type"
			]);
			if (Object.hasOwn(input, "type")) authorError(`${path} cannot declare both type and oneOf`);
			if (!isPlainJsonArray(input.oneOf)) authorError(`${path}.oneOf must be an array of at least two value schemas`);
			const branches = [];
			node.oneOf = branches;
			copyAnnotations(input, node);
			for (let index = input.oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "value",
				input: input.oneOf[index],
				path: `${path}.oneOf[${index}]`,
				allowRequired: false,
				destination: {
					kind: "one-of",
					target: branches,
					index
				}
			});
			continue;
		}
		const inputType = Object.hasOwn(input, "type") ? input.type : void 0;
		switch (inputType) {
			case "json":
				assertAuthorKeys(input, path, [...authorKeys, "type"]);
				copyAnnotations(input, node);
				break;
			case "object":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"properties",
					"additionalProperties"
				]);
				if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean") authorError(`${path}.additionalProperties must be explicitly true or false`);
				node.type = "object";
				copyAnnotations(input, node);
				node.additionalProperties = input.additionalProperties;
				if (Object.hasOwn(input, "properties")) tasks.push({
					kind: "property-map",
					input: input.properties,
					path: `${path}.properties`,
					destination: {
						kind: "object",
						target: node
					}
				});
				break;
			case "array":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"items"
				]);
				node.type = "array";
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "items")) tasks.push({
					kind: "value",
					input: input.items,
					path: `${path}.items`,
					allowRequired: false,
					destination: {
						kind: "item",
						target: node
					}
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"enum",
					"const"
				]);
				node.type = inputType;
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "enum")) {
					if (!isPlainJsonArray(input.enum)) authorError(`${path}.enum must be a non-empty array of scalar values`);
					node.enum = Array.from(input.enum, (entry) => entry);
				}
				if (Object.hasOwn(input, "const")) node.const = input.const;
				break;
			default: authorError(`${path}.type must be string/number/integer/boolean/null/array/object/json, or use oneOf`);
		}
	}
}
/** Compile one implicit property map, collecting per-property requiredness. */
function compilePropertyMap(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "property-map",
		input,
		path,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/** Compile one author node without applying any consumer root restriction. */
function compileValueSchema(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "value",
		input,
		path,
		allowRequired: false,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/**
* Compile one author-facing value schema to the enforced raw JSON Schema
* subset. The author-only `json` node becomes an annotation-only schema.
* @param spec - schema for any JSON-value root.
* @returns The asserted raw schema projection.
*/
function valueSchemaSpecToJsonSchema(spec) {
	const schema = compileValueSchema(spec, "schema");
	assertSupportedJsonSchema(schema);
	return schema;
}
/**
* Compile the implicit open parameter object into raw JSON Schema.
* @param spec - per-property parameter definitions.
* @returns An object-rooted raw schema with no implicit-root openness override.
*/
function parameterSchemaSpecToJsonSchema(spec) {
	const compiled = compilePropertyMap(spec, "parameters");
	const schema = {
		type: "object",
		properties: compiled.properties,
		...compiled.required === void 0 ? {} : { required: compiled.required }
	};
	assertSupportedJsonSchema(schema);
	return schema;
}
/** Invalid model-generated arguments for a typed tool. */
var ToolArgsError = class extends HarnessError {
	/** Individual violations in schema-walk order. */
	violations;
	constructor(violations) {
		super(`invalid arguments: ${violations.join("; ")}`, "INVALID_ARGS");
		this.name = "ToolArgsError";
		this.violations = violations;
	}
};
/**
* Define a first-party tool with inferred arguments and strict execution
* validation. Replay-only presenters validate softly and fall back to generic
* rendering for obsolete logged arguments.
* @param options - typed definition and optional finalizer and presenters.
* @returns A registry-ready definition.
*/
function defineTool(options) {
	const userExecute = options.execute;
	const userFinalizeContent = options.finalizeContent;
	const userProjectContent = options.projectContent;
	const userRender = options.output.render;
	const userPresentationMeta = options.output.presentationMeta;
	const userPresentCall = options.presentCall;
	const userPresentResult = options.presentResult;
	const userIsConcurrencySafe = options.isConcurrencySafe;
	if (options.timeoutMs !== void 0 && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
	const parameters = parameterSchemaSpecToJsonSchema(options.parameters);
	const outputSchema = valueSchemaSpecToJsonSchema(options.output.schema);
	const validate = (args) => validateJsonSchemaValue(parameters, args, "");
	const tool = {
		name: options.name,
		description: options.description,
		parameters,
		output: {
			schema: outputSchema,
			render(args, value) {
				return userRender(args, value);
			},
			...userPresentationMeta !== void 0 ? { presentationMeta(args, value) {
				return userPresentationMeta(args, value);
			} } : {}
		},
		...options.deferLoading === true ? { deferLoading: options.deferLoading } : {},
		...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
		async execute(args, exec) {
			const violations = validate(args);
			if (violations.length > 0) throw new ToolArgsError(violations);
			return userExecute(args, exec);
		}
	};
	if (userProjectContent) tool.projectContent = (exec, result) => userProjectContent(exec, result);
	if (userFinalizeContent) tool.finalizeContent = (exec, result) => userFinalizeContent(exec, result);
	if (userPresentCall) tool.presentCall = (args) => {
		if (validate(args).length > 0) return void 0;
		return userPresentCall(args);
	};
	if (userPresentResult) tool.presentResult = (args, result) => {
		if (validate(args).length > 0) return void 0;
		return userPresentResult(args, result);
	};
	if (userIsConcurrencySafe) tool.isConcurrencySafe = (args) => {
		if (validate(args).length > 0) return false;
		return userIsConcurrencySafe(args);
	};
	return tool;
}
/**
* Omit execution and presentation callbacks from a tool definition.
* @param definition - visible capability or executor-owned transport.
* @param detachParameters - copy parameters for a caller-owned inspection result.
* @returns the model-facing schema fields.
*/
function projectToolSchema(definition, detachParameters) {
	const { name, description, parameters, deferLoading } = definition;
	const detached = detachParameters ? snapshotJsonValue(parameters) : parameters;
	if (detached === void 0) throw new Error(`tool "${name}" parameters must be lossless JSON before schema projection`);
	return {
		name,
		description,
		parameters: detached,
		...deferLoading === true ? { deferLoading } : {}
	};
}
/** Tool definitions and scoped dispatch to plugin-owned executors. @module */
/** One scope's complete tool-registry contribution. */
var ToolLayer = class {
	tools;
	restrictions = new AnonymousEntries();
	constructor(scope) {
		this.tools = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `tool "${name}" is already registered (for a per-agent variant, register through that agent's \`agent.ctx\` instead)` : `tool "${name}" is already registered in this scope`));
	}
	/** Whether every contribution table in this aggregate layer is empty. */
	isEmpty() {
		return this.tools.isEmpty() && this.restrictions.isEmpty();
	}
	/** Whether every compiled restriction in this layer admits a global tool name. */
	admits(name) {
		for (const filter of this.restrictions.values()) if (filter.allow !== void 0 && !filter.allow.has(name) || filter.deny !== void 0 && filter.deny.has(name)) return false;
		return true;
	}
};
var GuardLayer = class {
	guards = new AnonymousEntries();
	isEmpty() {
		return this.guards.isEmpty();
	}
};
(class extends Service {
	static inject = ["systemPrompt"];
	static Config = Schema.object({
		mode: Schema.never().description("Removed. Mount a native or PTC tool executor instead."),
		maxParallelSubCalls: Schema.never().description("Moved to the PTC tool executor configuration.")
	});
	layers = new ScopedLayers((scope) => new ToolLayer(scope), () => {
		this.ctx.emit("tools/change");
	});
	scoped = /* @__PURE__ */ new WeakMap();
	root;
	guards = new ScopedLayers(() => new GuardLayer(), () => {});
	constructor(ctx) {
		super(ctx, "tools");
		ctx.systemPrompt.tools(({ scope, toolSet }) => {
			const description = this.selectExecutor(scope).describe(this.definitions(scope, toolSet));
			return {
				...description,
				knownNames: description.knownNames ?? [...this.view(scope).knownNames]
			};
		});
	}
	/**
	* Register globally or in the calling agent scope. Scoped tools shadow
	* globals; duplicates within one layer and the reserved `run_code` name fail.
	* @param definition - tool schema, execution, and optional finalization/presentation callbacks.
	* @param options - optional step-time activation condition.
	* @returns the exact disposer that unregisters the tool.
	*/
	register(definition, options = {}) {
		const name = definition.name;
		const output = definition.output;
		if (output === void 0 || typeof output !== "object" || typeof output.render !== "function" || output.presentationMeta !== void 0 && typeof output.presentationMeta !== "function") throw new TypeError(`tool "${name}" must declare output { schema, render, presentationMeta? }`);
		assertSupportedJsonSchema(output.schema);
		const timeoutMs = definition.timeoutMs;
		if (timeoutMs !== void 0 && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) throw new TypeError(`tool "${name}" timeoutMs must be a positive finite number`);
		if (name === "run_code") throw new Error(`tool name "${RUN_CODE_NAME}" is reserved for the PTC mode presentation transport and cannot be registered or shadowed`);
		return this.layers.effect(this.ctx, (layer) => layer.tools.insert(name, {
			definition,
			when: options.when
		}), { label: "tools.register()" });
	}
	/**
	* Restrict global tools for the calling agent scope. Empty filters, unknown
	* names, scope-local names, and reserved transport names fail. Restrictions
	* intersect; scoped registrations remain visible.
	* @param filter - global-tool mask: `allow` (keep only) and/or `deny` (remove).
	* @returns the exact disposer that lifts this restriction.
	*/
	restrict(filter) {
		const scope = scopeOf(this.ctx);
		if (scope === void 0) throw new Error("tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent — deny the tool for the intended agent instead");
		const allow = filter.allow;
		const deny = filter.deny;
		if (allow === void 0 && deny === void 0) throw new Error("tools.restrict({}) is a no-op: pass `allow` and/or `deny` (an empty filter is almost always a materialized-empty-config bug)");
		const compiled = {
			...allow !== void 0 ? { allow: new Set(allow) } : {},
			...deny !== void 0 ? { deny: new Set(deny) } : {}
		};
		if ([...allow ?? [], ...deny ?? []].includes("run_code")) throw new Error(`tools.restrict() cannot name reserved PTC mode presentation transport "${RUN_CODE_NAME}"; restrict end-capability tools instead`);
		const known = this.view(scope).restrictableNames;
		const unknown = [...allow ?? [], ...deny ?? []].filter((name) => !known.has(name));
		if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")}; known global tools: ${[...known].sort().join(", ") || "(none)"}`);
		return this.layers.effect(this.ctx, (layer) => layer.restrictions.append(compiled), { label: "tools.restrict()" });
	}
	/**
	* Resolve visible tools and pre-restriction names. Restrictions across the
	* scope chain intersect over inherited global and ancestor tools; the viewing
	* scope's own registrations remain exempt. Nearer registrations shadow
	* farther ones. Pre-restriction names support restriction and prompt-order validation.
	* @param scope - the viewing scope (the agent), or undefined for the global view.
	* @returns the complete derived view for that scope.
	*/
	view(scope) {
		const layers = this.layers.chainLayers(scope);
		const own = this.layers.peek(scope);
		const inherited = new Map(this.layers.global.tools.entries());
		for (const layer of layers) {
			if (layer === own) continue;
			for (const [name, registration] of layer.tools.entries()) inherited.set(name, registration);
		}
		const visible = /* @__PURE__ */ new Map();
		const registrations = /* @__PURE__ */ new Map();
		const knownNames = /* @__PURE__ */ new Set();
		const restrictableNames = /* @__PURE__ */ new Set();
		for (const [name, registration] of inherited) {
			knownNames.add(name);
			restrictableNames.add(name);
			if (layers.every((layer) => layer.admits(name))) {
				visible.set(name, registration.definition);
				registrations.set(name, registration);
			}
		}
		if (own !== void 0) for (const [name, registration] of own.tools.entries()) {
			knownNames.add(name);
			visible.set(name, registration.definition);
			registrations.set(name, registration);
		}
		return {
			visible,
			registrations,
			knownNames,
			restrictableNames
		};
	}
	/**
	* Look up a tool as one scope sees it (scoped
	* shadows global; a restricted-away global reads as absent). Presenters pass
	* the calling agent so the rendered card matches the definition that
	* actually executed.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @param toolSet - step admission; omit only to inspect registered definitions.
	* @returns the definition the scope resolves, or undefined when none is visible.
	*/
	get(name, scope, toolSet) {
		return toolSet === void 0 ? this.view(scope).visible.get(name) : toolSet.view(scope).get(name);
	}
	/**
	* Resolve the definition a call may execute. With a step's admitted set, the
	* set decides; without one, conditional registrations are unavailable.
	* @param name - the tool name as registered.
	* @param scope - the calling agent; omitted = the global view.
	* @param toolSet - step admission, or omitted for a call outside a model step.
	* @returns the executable definition, or undefined when the call must fail as `UNKNOWN_TOOL`.
	*/
	executable(name, scope, toolSet) {
		if (toolSet !== void 0) return toolSet.view(scope).get(name);
		const view = this.view(scope);
		return view.registrations.get(name)?.when === void 0 ? view.visible.get(name) : void 0;
	}
	/**
	* Resolve conditions once for this step without changing shared registrations.
	* Cancellation or a rejected condition publishes no partial selection. Removed
	* registrations cannot be restored by a late condition result.
	* @param context - preparing agent, captured model selection, and cancellation.
	* @returns the complete selection; the caller disposes it after its tool batch settles.
	*/
	async resolve(context) {
		const { agent, signal } = context;
		signal.throwIfAborted();
		const view = this.view(agent);
		const admitted = /* @__PURE__ */ new Map();
		for (const [name, definition] of view.visible) {
			const registration = view.registrations.get(name);
			let enabled;
			try {
				enabled = registration?.when === void 0 || await registration.when(context);
			} catch (cause) {
				signal.throwIfAborted();
				throw new ToolActivationError(name, cause);
			}
			signal.throwIfAborted();
			if (enabled) admitted.set(name, definition);
		}
		let closed = false;
		return Object.freeze({
			dispose: () => {
				closed = true;
			},
			view: (scope) => {
				const visible = /* @__PURE__ */ new Map();
				if (closed || scope !== agent) return visible;
				const current = this.view(agent);
				for (const [name, definition] of admitted) if (current.visible.get(name) === definition && current.registrations.get(name) === view.registrations.get(name)) visible.set(name, definition);
				return visible;
			}
		});
	}
	/**
	* Read the visible capability definitions for descriptions and program bindings.
	* @param scope - viewing Agent or preset; omitted selects the global view.
	* @param toolSet - step admission; omit only to inspect registered definitions.
	* @returns definitions after scoped shadowing and restrictions, limited to the step's admission when given.
	*/
	definitions(scope, toolSet) {
		return toolSet === void 0 ? [...this.view(scope).visible.values()] : [...toolSet.view(scope).values()];
	}
	/**
	* Project visible definitions onto the allowlisted model-facing schema fields,
	* excluding execution and presentation callbacks.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @param toolSet - step admission, or omitted for registered-definition inspection.
	* @returns one deep-cloned schema per visible tool.
	*/
	schemas(scope, toolSet) {
		return this.definitions(scope, toolSet).map((definition) => projectToolSchema(definition, true));
	}
	/**
	* Provide the executor for the calling scope; an unscoped contribution is the deployment default.
	* Rendering any executor-owned section requires the viewing scope's selection to remain available.
	* @param executor - initialized provider owned by the contributing plugin.
	* @returns the effect disposer. Unloading leaves the selection unavailable until it is replaced.
	*/
	setExecutor(executor) {
		const scope = scopeOf(this.ctx);
		if ((scope === void 0 ? this.root : this.scoped.get(scope))?.executor !== void 0) throw new Error("Only one tool executor may be registered in each scope");
		const record = { executor };
		return this.ctx.effect(function* () {
			for (const section of executor.sections ?? []) yield this.ctx.systemPrompt.section({
				name: section.name,
				order: section.order,
				...section.interpolate === void 0 ? {} : { interpolate: section.interpolate },
				text: ({ scope, toolSet }) => {
					if (this.selectExecutor(scope) !== executor) return "";
					return typeof section.text === "function" ? section.text(this.definitions(scope, toolSet)) : section.text;
				}
			});
			if (scope === void 0) this.root = record;
			else this.scoped.set(scope, record);
			yield () => {
				record.executor = void 0;
			};
		}.bind(this), "tools.setExecutor()");
	}
	/**
	* Resolve the nearest scoped provider, or the deployment default.
	* @param scope - Agent or preset scope; omitted selects only the root contribution.
	* @returns the selected executor; throws when it is missing or unloaded.
	*/
	selectExecutor(scope) {
		let record;
		for (const key of scopeChainOf(scope)) {
			record = this.scoped.get(key);
			if (record !== void 0) break;
		}
		record ??= this.root;
		const executor = record?.executor;
		if (executor === void 0) throw new ToolExecutorUnavailableError();
		return executor;
	}
	/**
	* Delegate a raw call batch to its Agent's provider or the deployment default.
	* Select at dispatch; accepted batches settle through that provider even if it unloads.
	* @param input - original calls, optional owning Agent, and optional logging step.
	* @returns the selected executor's settled batch; unavailable selections reject.
	*/
	async execute(input) {
		return this.selectExecutor(input.agent).execute(input);
	}
	/**
	* Register a monotonic denial in the calling scope.
	* @param guard - evaluated after extensible pre-execute policy by the shared pipeline.
	* @returns the effect disposer that removes this guard.
	*/
	guard(guard) {
		return this.guards.effect(this.ctx, (layer) => layer.guards.append(guard), { label: "tools.guard()" });
	}
	/**
	* Check global and inherited guards after pre-execute policy and approval resolve.
	* @param exec - invocation whose guards are checked before dispatch.
	* @returns the first denial reason, or undefined when no guard denies.
	*/
	checkGuards(exec) {
		for (const layer of [this.guards.global, ...this.guards.chainLayers(exec.agent)]) for (const guard of layer.guards.values()) {
			const reason = guard(exec);
			if (reason !== void 0) return reason;
		}
	}
});
//#endregion
//#region lib/types/tools.js
/**
* Build the three model tools over a service instance.
* @param service - Candidate discovery, submission, and status operations invoked by the tools.
* @param options - Clock used to timestamp submission attempts before calling the service.
* @returns Unregistered search, add, and status tool definitions; service failures propagate to their callers.
*/
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
/** Loader plugin name. */
const name = "dsh-downloader";
/** Host services required by the plugin. */
const inject = [
	"tools",
	"credentials",
	"typert"
];
/**
* Register the shared Remote service and tools in the owning host scope.
* @param ctx - Host scope providing tools, credentials, and Typert.
* @param config - Resolved downloader settings.
*/
function apply(ctx, config) {
	const remote = new DownloadRemote(ctx, config);
	for (const tool of createDownloadTools(remote.service, { clock: () => /* @__PURE__ */ new Date() })) ctx.effect(() => ctx.tools.register(tool));
}
//#endregion
export { Config, apply, inject, name, resolveStorePath };
