/** Downloader mount settings shared by the plugin entry and the Remote service. */
import z from '@deepseek-ai/schemastery';
/** Parse mount settings and supply defaults for omitted fields. */
export const Config = z.object({
    endpoint: z.string().default('http://10.0.0.7:8082/jsonrpc'),
    tokenRef: z.string().default('ARIA2_TOKEN'),
    timeoutMs: z.number().min(1).default(15000),
    storePath: z.string().default('downloader/submissions.json'),
    feedUrl: z.string().default('https://sukebei.nyaa.si/?page=rss&q=FC2-PPV&c=0_0&f=2'),
});
//# sourceMappingURL=config.js.map