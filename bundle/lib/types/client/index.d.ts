import type { Context } from '@deepseek-ai/cordis';
/** Services required by the browser plugin. */
export declare const inject: string[];
/** Mount the generated transport and UI, releasing both on failure or unload. */
export declare function apply(ctx: Context): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map