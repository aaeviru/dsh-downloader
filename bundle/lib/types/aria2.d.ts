/** Minimal JSON-RPC adapter; each invocation makes exactly one transport request. */
export interface Aria2Config {
    readonly endpoint: string;
    readonly token: string | null;
    readonly timeoutMs: number;
}
export interface Aria2TransportRequest {
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal: AbortSignal;
}
export interface Aria2TransportResponse {
    readonly ok: boolean;
    readonly status: number;
    text(): Promise<string>;
}
export type Aria2Transport = (request: Aria2TransportRequest) => Promise<Aria2TransportResponse>;
export interface Aria2Version {
    readonly version: string;
    readonly enabledFeatures: readonly string[];
}
export interface Aria2DownloadStatus {
    readonly gid: string;
    readonly status: string;
    readonly totalLength: number | null;
    readonly completedLength: number | null;
    readonly errorMessage: string | null;
    readonly followedBy: readonly string[];
}
export declare class Aria2Error extends Error {
}
export declare class Aria2AuthError extends Aria2Error {
}
export declare class Aria2TimeoutError extends Aria2Error {
}
export declare class Aria2ProtocolError extends Aria2Error {
    readonly status: number;
    readonly bodyPreview: string;
    constructor(message: string, status: number, bodyPreview: string);
}
export interface Aria2Client {
    getVersion(): Promise<Aria2Version>;
    addUri(uris: readonly string[], options?: Readonly<Record<string, string>>): Promise<{
        gid: string;
    }>;
    tellStatus(gid: string): Promise<Aria2DownloadStatus>;
}
/** Create a client. `transport` defaults to a thin wrapper over global fetch. */
export declare function createAria2Client(config: Aria2Config, transport?: Aria2Transport): Aria2Client;
//# sourceMappingURL=aria2.d.ts.map