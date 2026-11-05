/** Downloader plugin entry for DeepSeek Harness. */
import type { Context } from '@deepseek-ai/cordis';
import type { Config as DownloadConfig } from './remote.ts';
export { resolveStorePath } from './remote.ts';
export type Config = DownloadConfig;
export declare const Config: import("@deepseek-ai/schemastery").default<DownloadConfig>;
export declare const name = "dsh-downloader";
export declare const inject: readonly ["tools", "credentials", "typert"];
/** Register the shared Remote service and tools in the owning host scope. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map