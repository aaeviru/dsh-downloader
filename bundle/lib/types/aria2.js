/** Base failure type for aria2 calls, including authentication, deadline, and protocol failures. */
export class Aria2Error extends Error {
}
/** JSON-RPC error code 1 returned by aria2; the message identifies the method with the token removed. */
export class Aria2AuthError extends Aria2Error {
}
/** The call deadline expired; cancellation does not establish whether aria2 accepted the operation. */
export class Aria2TimeoutError extends Aria2Error {
}
/** Transport, HTTP, or response-validation failure with token-redacted response diagnostics. */
export class Aria2ProtocolError extends Aria2Error {
    /** HTTP status, or zero when no response was received. */
    status;
    /** Response text with the configured token removed, truncated to 200 UTF-8 bytes before decoding. */
    bodyPreview;
    constructor(message, status, bodyPreview) {
        super(message);
        this.status = status;
        this.bodyPreview = bodyPreview;
    }
}
function record(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error();
    return value;
}
function string(value) {
    if (typeof value !== 'string')
        throw new Error();
    return value;
}
function length(value) {
    if (value === undefined)
        return null;
    const raw = string(value);
    if (!/^\d+$/.test(raw) || !Number.isFinite(Number(raw)))
        throw new Error();
    return Number(raw);
}
const fetchTransport = request => fetch(request.url, {
    method: 'POST', headers: request.headers, body: request.body, signal: request.signal,
});
/**
 * Create a client. `transport` defaults to a thin wrapper over global fetch.
 * @param config - Endpoint, authentication token, and deadline covering transport and response parsing.
 * @param transport - Sends each JSON-RPC request, using its signal for cancellation.
 * @returns A client that validates responses and reports authentication, timeout, or protocol failures.
 */
export function createAria2Client(config, transport = fetchTransport) {
    const { endpoint, timeoutMs } = config;
    const token = config.token === '' ? null : config.token;
    let id = 0;
    const sanitize = (value) => {
        while (token && value.includes(token))
            value = value.split(token).join('');
        return value;
    };
    async function call(method, args, parse) {
        const controller = new AbortController();
        let status = 0;
        let body = '';
        let timer;
        const deadline = new Promise((_resolve, reject) => {
            timer = setTimeout(() => {
                controller.abort();
                reject(new Aria2TimeoutError(sanitize(method)));
            }, timeoutMs);
        });
        try {
            const requestId = ++id;
            const operation = async () => {
                const response = await transport({
                    url: endpoint,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params: token === null ? args : [`token:${token}`, ...args] }),
                    signal: controller.signal,
                });
                status = response.status;
                body = await response.text();
                if (!response.ok)
                    throw new Error();
                const envelope = record(JSON.parse(body));
                if (envelope.jsonrpc !== '2.0' || envelope.id !== requestId)
                    throw new Error();
                if (envelope.error !== undefined) {
                    const error = record(envelope.error);
                    if (error.code === 1)
                        throw new Aria2AuthError(sanitize(method));
                    throw new Error();
                }
                return parse(envelope.result);
            };
            return await Promise.race([operation(), deadline]);
        }
        catch (error) {
            if (controller.signal.aborted)
                throw new Aria2TimeoutError(sanitize(method));
            if (error instanceof Aria2AuthError)
                throw error;
            // Redact before truncation so a token crossing the preview boundary is removed.
            throw new Aria2ProtocolError(sanitize(method), status, Buffer.from(sanitize(body), 'utf8').subarray(0, 200).toString('utf8'));
        }
        finally {
            clearTimeout(timer);
        }
    }
    return {
        getVersion: () => call('aria2.getVersion', [], (value) => {
            const result = record(value);
            const features = result.enabledFeatures ?? [];
            if (!Array.isArray(features))
                throw new Error();
            return { version: string(result.version), enabledFeatures: features.map(string) };
        }),
        addUri: (uris, options) => call('aria2.addUri', options === undefined ? [uris] : [uris, options], value => ({ gid: string(value) })),
        tellStatus: gid => call('aria2.tellStatus', [gid], (value) => {
            const result = record(value);
            const followedBy = result.followedBy === undefined ? [] : result.followedBy;
            if (!Array.isArray(followedBy))
                throw new Error();
            return {
                gid: string(result.gid), status: string(result.status), followedBy: followedBy.map(string),
                totalLength: length(result.totalLength), completedLength: length(result.completedLength),
                errorMessage: result.errorMessage === undefined ? null : string(result.errorMessage),
            };
        }),
    };
}
//# sourceMappingURL=aria2.js.map