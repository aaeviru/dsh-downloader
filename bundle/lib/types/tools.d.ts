import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { DownloadService } from './service.ts';
/**
 * Build the three model tools over a service instance.
 * @param service - Candidate discovery, submission, and status operations invoked by the tools.
 * @param options - Clock used to timestamp submission attempts before calling the service.
 * @returns Unregistered search, add, and status tool definitions; service failures propagate to their callers.
 */
export declare function createDownloadTools(service: DownloadService, options: {
    readonly clock: () => Date;
}): readonly ToolDefinition[];
//# sourceMappingURL=tools.d.ts.map