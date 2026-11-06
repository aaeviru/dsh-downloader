/** Minimal JSON-RPC adapter; each invocation makes exactly one transport request. */
export interface Aria2Config {
    readonly endpoint: string;
    readonly token: string | null;
    readonly timeoutMs: number;
}
/** Serialized JSON-RPC POST request; the signal requests cancellation when the client deadline expires. */
export interface Aria2TransportRequest {
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
    readonly signal: AbortSignal;
}
/** HTTP response whose body is read before JSON-RPC validation. */
export interface Aria2TransportResponse {
    readonly ok: boolean;
    readonly status: number;
    text(): Promise<string>;
}
/** Sends one JSON-RPC POST request and should honor its abort signal. */
export type Aria2Transport = (request: Aria2TransportRequest) => Promise<Aria2TransportResponse>;
/** Server version and enabled features; an omitted feature list is exposed as an empty array. */
export interface Aria2Version {
    readonly version: string;
    readonly enabledFeatures: readonly string[];
}
/** Validated status with null for omitted lengths and error text, and an empty array for omitted successors. */
export interface Aria2DownloadStatus {
    readonly gid: string;
    readonly status: string;
    readonly totalLength: number | null;
    readonly completedLength: number | null;
    readonly errorMessage: string | null;
    readonly followedBy: readonly string[];
}
/** Base failure type for aria2 calls, including authentication, deadline, and protocol failures. */
export declare class Aria2Error extends Error {
}
/** JSON-RPC error code 1 returned by aria2; the message identifies the method with the token removed. */
export declare class Aria2AuthError extends Aria2Error {
}
/** The call deadline expired; cancellation does not establish whether aria2 accepted the operation. */
export declare class Aria2TimeoutError extends Aria2Error {
}
/** Transport, HTTP, or response-validation failure with token-redacted response diagnostics. */
export declare class Aria2ProtocolError extends Aria2Error {
    /** HTTP status, or zero when no response was received. */
    readonly status: number;
    /** Response text with the configured token removed, truncated to 200 UTF-8 bytes before decoding. */
    readonly bodyPreview: string;
    constructor(message: string, status: number, bodyPreview: string);
}
/** Validates aria2 responses and rejects failed calls with Aria2Error subclasses; calls are never retried. */
export interface Aria2Client {
    getVersion(): Promise<Aria2Version>;
    addUri(uris: readonly string[], options?: Readonly<Record<string, string>>): Promise<{
        gid: string;
    }>;
    tellStatus(gid: string): Promise<Aria2DownloadStatus>;
}
/**
 * Create a client. `transport` defaults to a thin wrapper over global fetch.
 * @param config - Endpoint, authentication token, and deadline covering transport and response parsing.
 * @param transport - Sends each JSON-RPC request, using its signal for cancellation.
 * @returns A client that validates responses and reports authentication, timeout, or protocol failures.
 */
export declare function createAria2Client(config: Aria2Config, transport?: Aria2Transport): Aria2Client;
//# sourceMappingURL=aria2.d.ts.map