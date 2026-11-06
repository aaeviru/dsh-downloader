/** Downloader plugin entry for DeepSeek Harness. */
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.ts';
export { Config } from './config.ts';
export { resolveStorePath } from './remote.ts';
/** Loader plugin name. */
export declare const name = "dsh-downloader";
/** Host services required by the plugin. */
export declare const inject: string[];
/**
 * Register the shared Remote service and tools in the owning host scope.
 * @param ctx - Host scope providing tools, credentials, and Typert.
 * @param config - Resolved downloader settings.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map