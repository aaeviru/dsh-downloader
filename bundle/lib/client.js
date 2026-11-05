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
			"sourceUrl": zod.z.string().readonly(),
			"submittable": zod.z.boolean().readonly(),
			"dedupeKey": zod.z.string().readonly()
		}));
		let _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema$value ??= zod.z.object({
			"discovered": zod.z.number().readonly(),
			"added": zod.z.number().readonly(),
			"skipped": zod.z.number().readonly(),
			"unsubmittable": zod.z.number().readonly()
		});
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
			"sourceUrl": zod.z.string().readonly(),
			"submittable": zod.z.boolean().readonly(),
			"dedupeKey": zod.z.string().readonly()
		}));
		let _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_status_result$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_result$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_result$schema$value ??= zod.z.object({ "state": zod.z.string() });
		let _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_add_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_search_parameter_0_strict$schema$value ??= zod.z.string();
		let _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema$value;
		const _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema = () => _deepseek_ai_dsh_experimental_downloader_download_status_parameter_0_strict$schema$value ??= zod.z.string();
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@deepseek-ai/dsh-experimental-downloader",
			methods: {
				"download/add": {
					service: "download",
					invocation: { kind: "direct" },
					parameters: [{
						name: "candidateId",
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
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 96,
						"column": 3
					}
				},
				"download/list": {
					service: "download",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader#download/list:result",
						create: _deepseek_ai_dsh_experimental_downloader_download_list_result$schema,
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
						"line": 91,
						"column": 3
					}
				},
				"download/refresh": {
					service: "download",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-downloader/types#RefreshResult",
						create: _deepseek_ai_dsh_experimental_downloader_download_refresh_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"discovered": { "type": "number" },
								"added": { "type": "number" },
								"skipped": { "type": "number" },
								"unsubmittable": { "type": "number" }
							},
							"required": [
								"discovered",
								"added",
								"skipped",
								"unsubmittable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 106,
						"column": 3
					}
				},
				"download/search": {
					service: "download",
					invocation: { kind: "direct" },
					parameters: [{
						name: "keyword",
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
						"line": 86,
						"column": 3
					}
				},
				"download/status": {
					service: "download",
					invocation: { kind: "direct" },
					parameters: [{
						name: "gid",
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
						jsonSchema: {
							"type": "object",
							"properties": { "state": { "type": "string" } },
							"required": ["state"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/experimental/dsh-downloader/src/remote.ts",
						"line": 101,
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
			const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
			return `${value("year")}年${value("month")}月${value("day")}日`;
		}
		/** Read one sortable value; missing values always sort last. */
		function sortValue(candidate, key) {
			if (key === "published") return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt);
			return candidate[key] ?? -1;
		}
		/** Order candidates by the selected column. */
		function order(candidates, sort) {
			const direction = sort.descending ? -1 : 1;
			return [...candidates].sort((left, right) => direction * (sortValue(left, sort.key) - sortValue(right, sort.key)));
		}
		/** Translate every host submission outcome. */
		function outcome(result, t) {
			if ("gid" in result) return t("submitted").replace("{gid}", result.gid);
			if ("alreadySubmitted" in result) return t("alreadySubmitted").replace("{gid}", result.alreadySubmitted);
			if ("alreadySubmitting" in result) return t("alreadySubmitting");
			return t("unsubmittable");
		}
		/** A candidate owns its pending state and visible submission outcome. */
		function CandidateRow({ candidate, t, download }) {
			const [pending, setPending] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)("");
			const published = formatPublished(candidate.publishedAt);
			async function submit() {
				setPending(true);
				try {
					const result = await download.add(candidate.id);
					setMessage(result.ok ? outcome(result.value, t) : t("submitError"));
				} catch {
					setMessage(t("submitError"));
				} finally {
					setPending(false);
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: !candidate.submittable || pending,
					onClick: () => {
						submit();
					},
					style: {
						display: "grid",
						gridTemplateColumns: "1fr 120px 70px 70px 70px",
						gap: 8,
						width: "100%",
						textAlign: "left",
						background: "none",
						border: "none",
						cursor: candidate.submittable ? "pointer" : "not-allowed",
						padding: "8px 4px",
						borderBottom: "1px solid var(--dsw-alias-border-l2)",
						color: "inherit"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: candidate.title }),
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
				!candidate.submittable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("unsubmittable") }),
				message !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "status",
					children: message
				})
			] });
		}
		/** Render loading, empty, candidate and recoverable error states. */
		function DownloaderPanel({ t, download }) {
			const [state, setState] = (0, react.useState)({ kind: "loading" });
			const [sort, setSort] = (0, react.useState)({
				key: "published",
				descending: true
			});
			const [keyword, setKeyword] = (0, react.useState)("");
			const [page, setPage] = (0, react.useState)(1);
			const load = (0, react.useCallback)(async (refresh) => {
				setState({ kind: "loading" });
				try {
					if (refresh) {
						if (!(await download.refresh()).ok) {
							setState({ kind: "error" });
							return;
						}
					}
					const result = await download.list(page);
					setState(result.ok ? {
						kind: "ready",
						candidates: result.value
					} : { kind: "error" });
				} catch {
					setState({ kind: "error" });
				}
			}, [download]);
			(0, react.useEffect)(() => {
				load(false);
			}, [load]);
			const runSearch = (0, react.useCallback)(async () => {
				setState({ kind: "loading" });
				setPage(1);
				try {
					const result = await download.search(keyword, 1);
					setState(result.ok ? {
						kind: "ready",
						candidates: result.value
					} : { kind: "error" });
				} catch {
					setState({ kind: "error" });
				}
			}, [download, keyword]);
			const visible = state.kind === "ready" ? order(state.candidates, sort) : [];
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
						style: {
							display: "flex",
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
								load(false);
							},
							children: t("retry")
						})]
					}),
					state.kind === "ready" && (state.candidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 120px 70px 70px 70px",
								gap: 8,
								padding: "6px 4px",
								borderBottom: "1px solid var(--dsw-alias-border-l2)",
								fontSize: 12,
								color: "var(--dsw-alias-label-secondary)"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("title") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("size") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("published") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("seeders") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("downloads") })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "group",
							"aria-label": "sort",
							style: {
								display: "flex",
								gap: 8,
								margin: "8px 0"
							},
							children: [
								"published",
								"seeders",
								"leechers",
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
								download
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
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-live": "polite",
									children: page
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setPage((value) => value + 1);
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
		/** Register localized downloader seats with context-owned cleanup. */
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