import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type Schema from '@deepseek-ai/schemastery';
import { Config } from './config.ts';
import type { DownloadService } from './service.ts';
import type { Candidate, RefreshResult, SubmitResult } from './types.ts';
export type { Config } from './config.ts';
/**
 * Resolve the submission store path.
 * @param storePath - absolute path, or one relative to the harness home.
 * @param env - environment carrying an optional `DSH_HOME` override.
 * @returns the absolute store path.
 */
export declare function resolveStorePath(storePath: string, env?: NodeJS.ProcessEnv): string;
/** Own the download service and its browser namespace. */
export declare class DownloadRemote extends TypertRemoteService {
    static inject: string[];
    /** Mount schema shared with the plugin entry. */
    static get Config(): Schema<Partial<Config>, Config>;
    /** The service the tools and the Remote methods share. */
    readonly service: DownloadService;
    constructor(ctx: Context, config: Config);
    /**
     * Search candidates through the service for one keyword.
     * @param keyword - text matched against candidate titles.
     * @returns the matching candidates after deduplication.
     */
    search(keyword: string): Promise<readonly Candidate[]>;
    /**
     * List the cached candidates, discovering them on first use.
     * @returns the current candidate set.
     */
    list(): Promise<readonly Candidate[]>;
    /**
     * Submit one cached candidate to aria2.
     * @param candidateId - identifier from the current candidate set.
     * @returns the submission outcome, GID, timestamp, and call ID.
     */
    add(candidateId: string): Promise<SubmitResult>;
    /**
     * Read the state of one aria2 download.
     * @param gid - aria2 download identifier returned by a submission.
     * @returns the aria2-reported state for that GID.
     */
    status(gid: string): Promise<{
        state: string;
    }>;
    /**
     * Rediscover the last executed query without submitting downloads.
     * @returns the candidates and discovery counts; source failure preserves the previous cache.
     */
    refresh(): Promise<RefreshResult>;
}
//# sourceMappingURL=remote.d.ts.map