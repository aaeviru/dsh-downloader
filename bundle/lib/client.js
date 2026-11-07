window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-experimental-downloader",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let zod = require("zod");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../typert/protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		//#endregion
		//#region lib/typert.remote-client.js
		let _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_add_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_add_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_add_result$schema$value ??= zod.z.union([
			zod.z.object({ "gid": zod.z.string().readonly() }),
			zod.z.object({ "alreadySubmitted": zod.z.string().readonly() }),
			zod.z.object({ "alreadySubmitting": zod.z.literal(true).readonly() }),
			zod.z.object({ "unsubmittable": zod.z.literal(true).readonly() })
		]);
		let _deepseek_ai_dsh_experimental_downloader_download_clearHistory_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_clearHistory_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_clearHistory_result$schema$value ??= zod.z.object({
			"history": zod.z.array(zod.z.string()).readonly(),
			"favorites": zod.z.array(zod.z.string()).readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_result$schema$value ??= zod.z.object({
			"history": zod.z.array(zod.z.string()).readonly(),
			"favorites": zod.z.array(zod.z.string()).readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_list_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_list_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_list_result$schema$value ??= zod.z.array(zod.z.object({
			"id": zod.z.string().readonly(),
			"sourceId": zod.z.string().readonly(),
			"title": zod.z.string().readonly(),
			"publishedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"infoHash": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"magnetUri": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"torrentUrl": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"sizeBytes": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"seeders": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm seeders when the feed reports them."),
			"leechers": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm leechers when the feed reports them."),
			"downloads": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Completed downloads when the feed reports them."),
			"sourceUrl": zod.z.string().readonly(),
			"submittable": zod.z.boolean().readonly(),
			"dedupeKey": zod.z.string().readonly()
		}));
		let _deepseek_ai_dsh_experimental_downloader_download_preferences_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_preferences_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_preferences_result$schema$value ??= zod.z.object({
			"history": zod.z.array(zod.z.string()).readonly(),
			"favorites": zod.z.array(zod.z.string()).readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_recordSearch_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_recordSearch_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_recordSearch_result$schema$value ??= zod.z.object({
			"history": zod.z.array(zod.z.string()).readonly(),
			"favorites": zod.z.array(zod.z.string()).readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema$value ??= zod.z.object({
			"candidates": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"sourceId": zod.z.string().readonly(),
				"title": zod.z.string().readonly(),
				"publishedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"infoHash": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"magnetUri": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"torrentUrl": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"sizeBytes": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
				"seeders": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm seeders when the feed reports them."),
				"leechers": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm leechers when the feed reports them."),
				"downloads": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Completed downloads when the feed reports them."),
				"sourceUrl": zod.z.string().readonly(),
				"submittable": zod.z.boolean().readonly(),
				"dedupeKey": zod.z.string().readonly()
			})).readonly(),
			"discovered": zod.z.number().readonly(),
			"known": zod.z.number().readonly(),
			"unsubmittable": zod.z.number().readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_resubmit_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_resubmit_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_resubmit_result$schema$value ??= zod.z.union([
			zod.z.object({ "gid": zod.z.string().readonly() }),
			zod.z.object({ "alreadySubmitted": zod.z.string().readonly() }),
			zod.z.object({ "alreadySubmitting": zod.z.literal(true).readonly() }),
			zod.z.object({ "unsubmittable": zod.z.literal(true).readonly() })
		]);
		let _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_search_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_search_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_search_result$schema$value ??= zod.z.array(zod.z.object({
			"id": zod.z.string().readonly(),
			"sourceId": zod.z.string().readonly(),
			"title": zod.z.string().readonly(),
			"publishedAt": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"infoHash": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"magnetUri": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"torrentUrl": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"sizeBytes": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"seeders": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm seeders when the feed reports them."),
			"leechers": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Swarm leechers when the feed reports them."),
			"downloads": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().optional().describe("Completed downloads when the feed reports them."),
			"sourceUrl": zod.z.string().readonly(),
			"submittable": zod.z.boolean().readonly(),
			"dedupeKey": zod.z.string().readonly()
		}));
		let _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_status_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_result$schema$value ??= zod.z.object({ "state": zod.z.string() });
		let _deepseek_ai_dsh_experimental_downloader_download_submissions_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_submissions_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_submissions_result$schema$value ??= zod.z.array(zod.z.object({
			"key": zod.z.string().readonly(),
			"gid": zod.z.string().readonly()
		}));
		let _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_result$schema$value ??= zod.z.object({
			"history": zod.z.array(zod.z.string()).readonly(),
			"favorites": zod.z.array(zod.z.string()).readonly()
		});
		let _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0_strict$schema$value ??= zod.z.string();
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@deepseek-ai/dsh-experimental-downloader",
			methods: {
				"download/add": {
					service: "download",
					description: "Submit one cached candidate to aria2.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "candidateId",
						description: "identifier from the current candidate set.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/add:candidateId",
							create: _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/add:candidateId",
							create: _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#SubmitResult",
						create: _deepseek_ai_dsh_experimental_downloader_download_add_result$schema,
						description: "the submission outcome, GID, timestamp, and call ID.",
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 166,
						"column": 3
					}
				},
				"download/clearHistory": {
					service: "download",
					description: "Clear history while retaining favorites.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#Preferences",
						create: _deepseek_ai_dsh_experimental_downloader_download_clearHistory_result$schema,
						description: "Committed preferences; persistence failures reject.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"history": {
									"type": "array",
									"items": { "type": "string" }
								},
								"favorites": {
									"type": "array",
									"items": { "type": "string" }
								}
							},
							"required": ["history", "favorites"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 137,
						"column": 3
					}
				},
				"download/deleteSearch": {
					service: "download",
					description: "Delete one history keyword while retaining favorites.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "keyword",
						description: "Exact keyword, with surrounding whitespace trimmed.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/deleteSearch:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/deleteSearch:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#Preferences",
						create: _deepseek_ai_dsh_experimental_downloader_download_deleteSearch_result$schema,
						description: "Committed preferences; persistence failures reject.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"history": {
									"type": "array",
									"items": { "type": "string" }
								},
								"favorites": {
									"type": "array",
									"items": { "type": "string" }
								}
							},
							"required": ["history", "favorites"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 128,
						"column": 3
					}
				},
				"download/list": {
					service: "download",
					description: "List the cached candidates, discovering them on first use.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/list:result",
						create: _deepseek_ai_dsh_experimental_downloader_download_list_result$schema,
						description: "the current candidate set.",
						jsonSchema: {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"id": { "type": "string" },
									"sourceId": { "type": "string" },
									"title": { "type": "string" },
									"publishedAt": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"infoHash": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"magnetUri": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"torrentUrl": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"sizeBytes": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "number" }] },
									"seeders": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Swarm seeders when the feed reports them."
									},
									"leechers": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Swarm leechers when the feed reports them."
									},
									"downloads": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Completed downloads when the feed reports them."
									},
									"sourceUrl": { "type": "string" },
									"submittable": { "type": "boolean" },
									"dedupeKey": { "type": "string" }
								},
								"required": [
									"id",
									"sourceId",
									"title",
									"publishedAt",
									"infoHash",
									"magnetUri",
									"torrentUrl",
									"sizeBytes",
									"sourceUrl",
									"submittable",
									"dedupeKey"
								],
								"additionalProperties": true
							}
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 156,
						"column": 3
					}
				},
				"download/preferences": {
					service: "download",
					description: "Read committed search preferences.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#Preferences",
						create: _deepseek_ai_dsh_experimental_downloader_download_preferences_result$schema,
						description: "Committed preferences; persistence failures reject.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"history": {
									"type": "array",
									"items": { "type": "string" }
								},
								"favorites": {
									"type": "array",
									"items": { "type": "string" }
								}
							},
							"required": ["history", "favorites"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 98,
						"column": 3
					}
				},
				"download/recordSearch": {
					service: "download",
					description: "Record a successfully executed search without executing it again.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "keyword",
						description: "Exact keyword, with surrounding whitespace trimmed.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/recordSearch:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/recordSearch:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_recordSearch_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#Preferences",
						create: _deepseek_ai_dsh_experimental_downloader_download_recordSearch_result$schema,
						description: "Committed preferences; persistence failures reject.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"history": {
									"type": "array",
									"items": { "type": "string" }
								},
								"favorites": {
									"type": "array",
									"items": { "type": "string" }
								}
							},
							"required": ["history", "favorites"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 108,
						"column": 3
					}
				},
				"download/refresh": {
					service: "download",
					description: "Rediscover the last executed query without submitting downloads.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#RefreshResult",
						create: _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema,
						description: "the candidates and discovery counts; source failure preserves the previous cache.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"candidates": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"id": { "type": "string" },
											"sourceId": { "type": "string" },
											"title": { "type": "string" },
											"publishedAt": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"infoHash": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"magnetUri": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"torrentUrl": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"sizeBytes": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "number" }] },
											"seeders": {
												"oneOf": [{
													"type": "null",
													"const": null
												}, { "type": "number" }],
												"description": "Swarm seeders when the feed reports them."
											},
											"leechers": {
												"oneOf": [{
													"type": "null",
													"const": null
												}, { "type": "number" }],
												"description": "Swarm leechers when the feed reports them."
											},
											"downloads": {
												"oneOf": [{
													"type": "null",
													"const": null
												}, { "type": "number" }],
												"description": "Completed downloads when the feed reports them."
											},
											"sourceUrl": { "type": "string" },
											"submittable": { "type": "boolean" },
											"dedupeKey": { "type": "string" }
										},
										"required": [
											"id",
											"sourceId",
											"title",
											"publishedAt",
											"infoHash",
											"magnetUri",
											"torrentUrl",
											"sizeBytes",
											"sourceUrl",
											"submittable",
											"dedupeKey"
										],
										"additionalProperties": true
									}
								},
								"discovered": { "type": "number" },
								"known": { "type": "number" },
								"unsubmittable": { "type": "number" }
							},
							"required": [
								"candidates",
								"discovered",
								"known",
								"unsubmittable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 204,
						"column": 3
					}
				},
				"download/resubmit": {
					service: "download",
					description: "Explicitly submit a candidate again, preserving its old record on failure.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "candidateId",
						description: "Candidate identifier resolved by the service.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/resubmit:candidateId",
							create: _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/resubmit:candidateId",
							create: _deepseek_ai_dsh_experimental_downloader_download_resubmit_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#SubmitResult",
						create: _deepseek_ai_dsh_experimental_downloader_download_resubmit_result$schema,
						description: "The new gid or a pending/unsupported outcome.",
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 185,
						"column": 3
					}
				},
				"download/search": {
					service: "download",
					description: "Search candidates through the service for one keyword.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "keyword",
						description: "text matched against candidate titles.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/search:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/search:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/search:result",
						create: _deepseek_ai_dsh_experimental_downloader_download_search_result$schema,
						description: "the matching candidates after deduplication.",
						jsonSchema: {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"id": { "type": "string" },
									"sourceId": { "type": "string" },
									"title": { "type": "string" },
									"publishedAt": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"infoHash": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"magnetUri": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"torrentUrl": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"sizeBytes": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "number" }] },
									"seeders": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Swarm seeders when the feed reports them."
									},
									"leechers": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Swarm leechers when the feed reports them."
									},
									"downloads": {
										"oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }],
										"description": "Completed downloads when the feed reports them."
									},
									"sourceUrl": { "type": "string" },
									"submittable": { "type": "boolean" },
									"dedupeKey": { "type": "string" }
								},
								"required": [
									"id",
									"sourceId",
									"title",
									"publishedAt",
									"infoHash",
									"magnetUri",
									"torrentUrl",
									"sizeBytes",
									"sourceUrl",
									"submittable",
									"dedupeKey"
								],
								"additionalProperties": true
							}
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 147,
						"column": 3
					}
				},
				"download/status": {
					service: "download",
					description: "Read the state of one aria2 download.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "gid",
						description: "aria2 download identifier returned by a submission.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/status:gid",
							create: _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/status:gid",
							create: _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/status:result",
						create: _deepseek_ai_dsh_experimental_downloader_download_status_result$schema,
						description: "the aria2-reported state for that GID.",
						jsonSchema: {
							"type": "object",
							"properties": { "state": { "type": "string" } },
							"required": ["state"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 195,
						"column": 3
					}
				},
				"download/submissions": {
					service: "download",
					description: "Read accepted submissions after store hydration.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/submissions:result",
						create: _deepseek_ai_dsh_experimental_downloader_download_submissions_result$schema,
						description: "Records keyed by candidate dedupe key.",
						jsonSchema: {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"key": { "type": "string" },
									"gid": { "type": "string" }
								},
								"required": ["key", "gid"],
								"additionalProperties": true
							}
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 175,
						"column": 9
					}
				},
				"download/toggleFavorite": {
					service: "download",
					description: "Toggle a saved keyword without searching or downloading.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "keyword",
						description: "Exact keyword, with surrounding whitespace trimmed.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/toggleFavorite:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/toggleFavorite:keyword",
							create: _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#Preferences",
						create: _deepseek_ai_dsh_experimental_downloader_download_toggleFavorite_result$schema,
						description: "Committed preferences; persistence failures reject.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"history": {
									"type": "array",
									"items": { "type": "string" }
								},
								"favorites": {
									"type": "array",
									"items": { "type": "string" }
								}
							},
							"required": ["history", "favorites"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 118,
						"column": 3
					}
				}
			}
		}, zod.z);
		//#endregion
		//#region src/client/DownloaderPanel.tsx
		/** Render a publication instant as a Japan-time calendar date. */
		function formatPublished(publishedAt) {
			if (publishedAt === null) return "—";
			const parts = new Intl.DateTimeFormat("en-US", {
				timeZone: "Asia/Tokyo",
				year: "numeric",
				month: "numeric",
				day: "numeric"
			}).formatToParts(new Date(publishedAt));
			const value = (type) => parts.find((part) => part.type === type).value;
			return `${value("year")}年${value("month")}月${value("day")}日`;
		}
		/** Read one sortable value; missing values always sort last. */
		function sortValue(candidate, key) {
			if (key === "title") return candidate.title;
			if (key === "size") return candidate.sizeBytes ?? -1;
			if (key === "published") return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt);
			return candidate[key] ?? -1;
		}
		/** Order candidates by the selected column. */
		function order(candidates, sort) {
			const direction = sort.descending ? -1 : 1;
			return [...candidates].sort((left, right) => {
				const a = sortValue(left, sort.key);
				const b = sortValue(right, sort.key);
				if (typeof a === "string" || typeof b === "string") return direction * String(a).localeCompare(String(b));
				return direction * (a - b);
			});
		}
		/** Translate every host submission outcome. */
		function outcome(result, t) {
			if ("gid" in result) return t("submitted").replace("{gid}", result.gid);
			if ("alreadySubmitted" in result) return t("alreadySubmitted").replace("{gid}", result.alreadySubmitted);
			if ("alreadySubmitting" in result) return t("alreadySubmitting");
			return t("unsubmittable");
		}
		/** A candidate owns its pending state and visible submission outcome. */
		function CandidateRow({ candidate, t, download, gid, selected, select, refreshSubmissions }) {
			const [pending, setPending] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)("");
			const published = formatPublished(candidate.publishedAt);
			async function submit(resubmit = false) {
				setPending(true);
				try {
					const result = await (resubmit ? download.resubmit(candidate.id) : download.add(candidate.id));
					setMessage(result.ok ? outcome(result.value, t) : t("submitError"));
					if (result.ok && ("gid" in result.value || "alreadySubmitted" in result.value)) {
						await refreshSubmissions();
						setMessage("");
					}
				} catch {
					setMessage(t("submitError"));
				} finally {
					setPending(false);
				}
			}
			function activate() {
				if (pending) return;
				select();
				if (gid === void 0 && candidate.submittable) submit();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				"data-submitted": gid !== void 0,
				style: { background: gid !== void 0 ? "var(--dsw-alias-state-success-tertiary)" : "none" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						onClick: activate,
						style: {
							display: "grid",
							gridTemplateColumns: "1fr 120px 70px 70px 70px",
							gap: 8,
							width: "100%",
							textAlign: "left",
							cursor: candidate.submittable ? "pointer" : "not-allowed",
							padding: "8px 4px",
							borderBottom: "1px solid var(--dsw-alias-border-l2)",
							color: "inherit"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: pending || gid === void 0 && !candidate.submittable,
									style: {
										background: "none",
										border: "none",
										padding: 0,
										color: "inherit",
										textAlign: "left",
										cursor: "inherit"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: candidate.title })
								}), selected && gid !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": t("resubmit"),
									disabled: pending || !candidate.submittable,
									onClick: (event) => {
										event.stopPropagation();
										submit(true);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "↻"
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)" },
								children: candidate.sizeBytes === null ? t("unknownSize") : new Intl.NumberFormat(void 0, {
									style: "unit",
									unit: "byte"
								}).format(candidate.sizeBytes)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)" },
								children: published
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: candidate.seeders ?? "—" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: candidate.downloads ?? "—" })
						]
					}),
					gid !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: t("submitted").replace("{gid}", gid)
					}),
					!candidate.submittable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("unsubmittable") }),
					message !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: message
					})
				]
			});
		}
		/** Render loading, empty, candidate and recoverable error states. */
		function DownloaderPanel({ t, download }) {
			const [state, setState] = (0, react.useState)({ kind: "loading" });
			const [sort, setSort] = (0, react.useState)({
				key: "published",
				descending: true
			});
			const [keyword, setKeyword] = (0, react.useState)("");
			const [preferences, setPreferences] = (0, react.useState)({
				history: [],
				favorites: []
			});
			const [preferencesError, setPreferencesError] = (0, react.useState)(false);
			const [preferencesPending, setPreferencesPending] = (0, react.useState)(true);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const preferenceArea = (0, react.useRef)(null);
			const preferenceButton = (0, react.useRef)(null);
			const changePreferences = (0, react.useCallback)(async (operation) => {
				setPreferencesPending(true);
				try {
					const result = await operation();
					if (!result.ok) throw result.error;
					setPreferences(result.value);
					setPreferencesError(false);
				} catch {
					setPreferencesError(true);
				} finally {
					setPreferencesPending(false);
				}
			}, []);
			(0, react.useEffect)(() => {
				changePreferences(() => download.preferences());
			}, [download, changePreferences]);
			(0, react.useEffect)(() => {
				if (!expanded) return;
				const outside = (event) => {
					if (event.target instanceof Node && !preferenceArea.current?.contains(event.target)) setExpanded(false);
				};
				document.addEventListener("pointerdown", outside);
				return () => {
					document.removeEventListener("pointerdown", outside);
				};
			}, [expanded]);
			const lastExecutedKeyword = (0, react.useRef)(void 0);
			const [candidates, setCandidates] = (0, react.useState)([]);
			const [page, setPage] = (0, react.useState)(1);
			const [selectedId, setSelectedId] = (0, react.useState)();
			const [submittedGids, setSubmittedGids] = (0, react.useState)(/* @__PURE__ */ new Map());
			const submittedKeys = new Set(submittedGids.keys());
			const refreshSubmissions = (0, react.useCallback)(async () => {
				const result = await download.submissions();
				if (!result.ok) throw result.error;
				setSubmittedGids(new Map(result.value.map((record) => [record.key, record.gid])));
			}, [download]);
			const pageSize = 20;
			const load = (0, react.useCallback)(async (refresh) => {
				setState({ kind: "loading" });
				try {
					await refreshSubmissions();
					if (refresh && lastExecutedKeyword.current === void 0) {
						const result = await download.refresh();
						if (!result.ok) {
							setState({ kind: "error" });
							return;
						}
						setCandidates(result.value.candidates);
						setState({ kind: "ready" });
					} else {
						const result = refresh ? await download.search(lastExecutedKeyword.current) : await download.list();
						if (result.ok) {
							setCandidates(result.value);
							setState({ kind: "ready" });
						} else setState({ kind: "error" });
					}
					setPage(1);
				} catch {
					setState({ kind: "error" });
				}
			}, [download, refreshSubmissions]);
			(0, react.useEffect)(() => {
				load(false);
			}, [load]);
			const runSearch = (0, react.useCallback)(async () => {
				const executed = keyword.trim();
				if (!executed || state.kind === "loading") return;
				setState({ kind: "loading" });
				setPage(1);
				lastExecutedKeyword.current = executed;
				try {
					await refreshSubmissions();
					const result = await download.search(executed);
					if (result.ok) {
						setCandidates(result.value);
						await changePreferences(() => download.recordSearch(executed));
					}
					setState(result.ok ? { kind: "ready" } : { kind: "error" });
				} catch {
					setState({ kind: "error" });
				}
			}, [
				download,
				keyword,
				refreshSubmissions,
				changePreferences,
				state.kind
			]);
			const ordered = order(candidates, sort);
			const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
			const visible = ordered.slice((page - 1) * pageSize, page * pageSize);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: {
					padding: 24,
					color: "var(--dsw-alias-label-primary)",
					background: "var(--dsw-alias-bg-base)"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: t("panel") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: { color: "var(--dsw-alias-label-secondary)" },
						children: t("description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: preferenceArea,
						onKeyDown: (event) => {
							if (event.key === "Escape") {
								setExpanded(false);
								preferenceButton.current?.focus();
							}
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: 8,
								alignItems: "center",
								margin: "12px 0"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									"aria-label": t("search"),
									value: keyword,
									placeholder: t("search"),
									onChange: (event) => {
										setKeyword(event.target.value);
									},
									onKeyDown: (event) => {
										if (event.key === "Enter") runSearch();
									},
									style: {
										padding: "6px 8px",
										minWidth: 220
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: state.kind === "loading",
									onClick: () => {
										runSearch();
									},
									children: t("search")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: state.kind === "loading",
									onClick: () => {
										load(true);
									},
									children: t("refresh")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									ref: preferenceButton,
									type: "button",
									"aria-expanded": expanded,
									onClick: () => {
										setExpanded((value) => !value);
									},
									children: t("savedSearches")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !keyword.trim() || preferencesPending,
									"aria-pressed": preferences.favorites.includes(keyword.trim()),
									onClick: () => {
										changePreferences(() => download.toggleFavorite(keyword.trim()));
									},
									children: t(preferences.favorites.includes(keyword.trim()) ? "unfavorite" : "favorite")
								})
							]
						}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: 12,
								border: "1px solid var(--dsw-alias-border-l2)",
								maxHeight: 300,
								overflowY: "auto"
							},
							children: [
								["favorites", "history"].map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									"aria-label": t(group === "history" ? "recent" : "favorites"),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										style: {
											fontSize: "inherit",
											fontWeight: 500
										},
										children: t(group === "history" ? "recent" : "favorites")
									}), preferences[group].map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											flexWrap: "wrap",
											gap: 8
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { overflowWrap: "anywhere" },
												onClick: () => {
													setKeyword(item);
													setExpanded(false);
												},
												children: item
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: preferencesPending,
												"aria-label": `${t(preferences.favorites.includes(item) ? "unfavorite" : "favorite")} ${item}`,
												onClick: () => {
													changePreferences(() => download.toggleFavorite(item));
												},
												children: t(preferences.favorites.includes(item) ? "unfavorite" : "favorite")
											}),
											group === "history" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												disabled: preferencesPending,
												"aria-label": `${t("deleteSearch")} ${item}`,
												onClick: () => {
													changePreferences(() => download.deleteSearch(item));
												},
												children: t("deleteSearch")
											})
										]
									}, item))]
								}, group)),
								preferences.history.length === 0 && preferences.favorites.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("noSavedSearches") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: preferencesPending || preferences.history.length === 0,
									onClick: () => {
										changePreferences(() => download.clearHistory());
									},
									children: t("clearHistory")
								})
							]
						})]
					}),
					preferencesError && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "alert",
						children: [
							t("preferencesError"),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: preferencesPending,
								onClick: () => {
									changePreferences(() => download.preferences());
								},
								children: t("retry")
							})
						]
					}),
					state.kind === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "status",
						children: t("loading")
					}),
					state.kind === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								load(true);
							},
							children: t("retry")
						})]
					}),
					(state.kind === "ready" || candidates.length > 0) && (candidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 120px 70px 70px 70px",
								gap: 8,
								padding: "6px 4px",
								borderBottom: "1px solid var(--dsw-alias-border-l2)",
								fontSize: 12
							},
							children: [
								"title",
								"size",
								"published",
								"seeders",
								"downloads"
							].map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": sort.key === key,
								onClick: () => {
									setSort((current) => ({
										key,
										descending: current.key === key ? !current.descending : true
									}));
								},
								style: {
									background: "none",
									border: "none",
									padding: 0,
									textAlign: "left",
									cursor: "pointer",
									color: sort.key === key ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
									fontSize: 12
								},
								children: [t(key), sort.key === key ? sort.descending ? " ↓" : " ↑" : ""]
							}, key))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							style: {
								listStyle: "none",
								padding: 0,
								margin: 0,
								maxHeight: 420,
								overflowY: "auto"
							},
							children: visible.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CandidateRow, {
								candidate,
								t,
								download,
								gid: submittedKeys.has(candidate.dedupeKey) ? submittedGids.get(candidate.dedupeKey) : void 0,
								selected: selectedId === candidate.id,
								select: () => {
									setSelectedId(candidate.id);
								},
								refreshSubmissions
							}, candidate.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								alignItems: "center",
								marginTop: 8
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: page <= 1,
									onClick: () => {
										setPage((value) => Math.max(1, value - 1));
									},
									children: "‹"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									"aria-live": "polite",
									children: [
										page,
										" / ",
										pageCount
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: page >= pageCount,
									onClick: () => {
										setPage((value) => Math.min(pageCount, value + 1));
									},
									children: "›"
								})
							]
						})
					] }))
				]
			});
		}
		//#endregion
		//#region src/client/DownloaderIcon.tsx
		/** Sidebar download icon using the current theme. */
		function DownloaderIcon({ size, active }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				style: { color: active ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 2,
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Panel dictionary namespace. */
		const NS = "downloader";
		/** English panel copy. */
		const en = {
			savedSearches: "Saved searches",
			favorites: "Favorites",
			recent: "Recent searches",
			favorite: "Favorite",
			unfavorite: "Unfavorite",
			deleteSearch: "Delete search",
			clearHistory: "Clear history",
			noSavedSearches: "No saved searches yet.",
			preferencesError: "Unable to save or load search preferences. Retry loading preferences.",
			panel: "Downloader",
			description: "Browse and submit download candidates.",
			refresh: "Refresh",
			search: "Search",
			title: "Title",
			size: "Size",
			loading: "Loading…",
			empty: "No download candidates yet.",
			error: "Unable to load downloads.",
			retry: "Retry",
			submit: "Submit",
			resubmit: "Re-download",
			submitting: "Submitting…",
			submitted: "Submitted: {gid}",
			alreadySubmitted: "Previously submitted: {gid}",
			alreadySubmitting: "Already submitting.",
			unsubmittable: "Cannot submit this candidate.",
			submitError: "Unable to submit this candidate.",
			unknownSize: "Unknown size",
			published: "Published",
			seeders: "Seeders",
			leechers: "Leechers",
			downloads: "Downloads"
		};
		/** Chinese panel copy. */
		const zh = {
			savedSearches: "已保存的搜索",
			favorites: "收藏",
			recent: "最近搜索",
			favorite: "收藏",
			unfavorite: "取消收藏",
			deleteSearch: "删除搜索",
			clearHistory: "清空历史",
			noSavedSearches: "暂无已保存的搜索",
			preferencesError: "无法保存或加载搜索偏好，请重试加载",
			panel: "下载器",
			description: "浏览并提交下载候选项。",
			refresh: "刷新",
			search: "搜索",
			title: "标题",
			size: "大小",
			loading: "加载中…",
			empty: "暂无下载候选项。",
			error: "无法加载下载列表。",
			retry: "重试",
			submit: "提交",
			resubmit: "重新下载",
			submitting: "提交中…",
			submitted: "已提交：{gid}",
			alreadySubmitted: "此前已提交：{gid}",
			alreadySubmitting: "正在提交。",
			unsubmittable: "无法提交此候选项。",
			submitError: "提交此候选项失败。",
			unknownSize: "大小未知",
			published: "发布",
			seeders: "做种",
			leechers: "下载中",
			downloads: "完成"
		};
		//#endregion
		//#region src/client/mount.ts
		/**
		* Register localized downloader seats with context-owned cleanup.
		* @param ctx - Client context owning the locale dictionaries and slot registrations.
		* @param download - Download operations injected into the downloader panel.
		*/
		function mountDownloader(ctx, download) {
			ctx.effect(() => ctx.locale.register(NS, {
				en,
				zh
			}), "dsh-downloader: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: "downloader",
				locale: NS,
				inject: () => ({
					t,
					download
				})
			}, DownloaderPanel));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: "downloader",
				order: 40,
				locale: NS,
				label: () => t("panel")
			}, DownloaderIcon));
		}
		//#endregion
		//#region src/client/index.ts
		/** Services required by the browser plugin. */
		const inject = [
			"remote",
			"slots",
			"locale"
		];
		/** Mount the generated transport and UI, releasing both on failure or unload. */
		async function apply(ctx) {
			const transport = ctx.plugin(async (owner) => {
				await owner.remote.$mount(TYPERT_REMOTE);
			});
			const ui = ctx.inject([
				"remote.download",
				"slots",
				"locale"
			], (scope) => {
				mountDownloader(scope, scope.remote.download);
			});
			const dispose = ctx.effect(function* () {
				yield transport.dispose;
				yield ui.dispose;
			}, "dsh-downloader: mount");
			try {
				await Promise.all([transport, ui]);
			} catch (error) {
				await dispose();
				throw error;
			}
			return dispose;
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map