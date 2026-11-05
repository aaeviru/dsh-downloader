import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import type { DownloadService } from './service.ts';
import type { Candidate, RefreshResult, SubmitResult } from './types.ts';
/**
 * Resolve the submission store path.
 * @param storePath - absolute path, or one relative to the harness home.
 * @param env - environment carrying an optional `DSH_HOME` override.
 * @returns the absolute store path.
 */
export declare function resolveStorePath(storePath: string, env?: NodeJS.ProcessEnv): string;
export interface Config {
    endpoint: string;
    tokenRef: string;
    timeoutMs: number;
    storePath: string;
    feedUrl: string;
}
/** Own the download service and its browser namespace. */
export declare class DownloadRemote extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    /** The service the tools and the Remote methods share. */
    readonly service: DownloadService;
    constructor(ctx: Context, config: Config);
    search(keyword: string): Promise<readonly Candidate[]>;
    list(): Promise<readonly Candidate[]>;
    add(candidateId: string): Promise<SubmitResult>;
    status(gid: string): Promise<{
        state: string;
    }>;
    refresh(): Promise<RefreshResult>;
}
//# sourceMappingURL=remote.d.ts.map