/** Downloader mount settings shared by the plugin entry and the Remote service. */
import z from '@deepseek-ai/schemastery';
/** Resolved downloader settings after defaults are applied. */
export interface Config {
    /** aria2 JSON-RPC endpoint URL. */
    endpoint: string;
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
export declare const Config: z<Partial<Config>, Config>;
//# sourceMappingURL=config.d.ts.map