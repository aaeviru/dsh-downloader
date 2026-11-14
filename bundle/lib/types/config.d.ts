/** Downloader mount settings shared by the plugin entry and the Remote service. */
import type { Volatile } from '@deepseek-ai/cordis';
import type { QualityFilter, CategoryCode } from './catalog.ts';
import z from '@deepseek-ai/schemastery';
/** Resolved downloader settings after defaults are applied. */
export interface Config {
    /** aria2 JSON-RPC endpoint URL. */
    endpoint: Volatile<string>;
    /** Live quality filter; unset inherits the feed URL. */
    qualityFilter: Volatile<QualityFilter | undefined>;
    /** Live category; unset inherits the feed URL. */
    category: Volatile<CategoryCode | undefined>;
    /** Credential reference resolved for aria2 authentication. */
    tokenRef: string;
    /** Request timeout in milliseconds; must be at least one. */
    timeoutMs: number;
    /** Submission store file, absolute or relative to the harness home. */
    storePath: string;
    /** RSS feed URL used for candidate discovery and keyword searches. */
    feedUrl: string;
}
/** Parse mount settings and supply defaults for omitted fields. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    endpoint: z<string, string, "volatile-defined">;
    qualityFilter: z<"0" | "1" | "2", "0" | "1" | "2", "volatile">;
    category: z<"0_0" | "1_0" | "1_1" | "1_2" | "1_3" | "1_4" | "1_5" | "2_0" | "2_1" | "2_2", "0_0" | "1_0" | "1_1" | "1_2" | "1_3" | "1_4" | "1_5" | "2_0" | "2_1" | "2_2", "volatile">;
    tokenRef: z<string, string, "defined">;
    timeoutMs: z<number, number, "defined">;
    storePath: z<string, string, "defined">;
    feedUrl: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    endpoint: z<string, string, "volatile-defined">;
    qualityFilter: z<"0" | "1" | "2", "0" | "1" | "2", "volatile">;
    category: z<"0_0" | "1_0" | "1_1" | "1_2" | "1_3" | "1_4" | "1_5" | "2_0" | "2_1" | "2_2", "0_0" | "1_0" | "1_1" | "1_2" | "1_3" | "1_4" | "1_5" | "2_0" | "2_1" | "2_2", "volatile">;
    tokenRef: z<string, string, "defined">;
    timeoutMs: z<number, number, "defined">;
    storePath: z<string, string, "defined">;
    feedUrl: z<string, string, "defined">;
}>>, "plain">;
//# sourceMappingURL=config.d.ts.map