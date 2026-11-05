import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { DownloadService } from './service.ts';
/** Build the three model tools over a service instance. */
export declare function createDownloadTools(service: DownloadService, options: {
    readonly clock: () => Date;
}): readonly ToolDefinition[];
//# sourceMappingURL=tools.d.ts.map