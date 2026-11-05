/** Minimal JSON-RPC adapter; each invocation makes exactly one transport request. */
export interface Aria2Config {
  readonly endpoint: string
  readonly token: string | null
  readonly timeoutMs: number
}

export interface Aria2TransportRequest {
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
  readonly signal: AbortSignal
}

export interface Aria2TransportResponse {
  readonly ok: boolean
  readonly status: number
  text(): Promise<string>
}

export type Aria2Transport = (request: Aria2TransportRequest) => Promise<Aria2TransportResponse>

export interface Aria2Version {
  readonly version: string
  readonly enabledFeatures: readonly string[]
}

export interface Aria2DownloadStatus {
  readonly gid: string
  readonly status: string
  readonly totalLength: number | null
  readonly completedLength: number | null
  readonly errorMessage: string | null
}

export class Aria2Error extends Error {}
export class Aria2AuthError extends Aria2Error {}
export class Aria2TimeoutError extends Aria2Error {}
export class Aria2ProtocolError extends Aria2Error {
  readonly status: number
  readonly bodyPreview: string

  constructor(message: string, status: number, bodyPreview: string) {
    super(message)
    this.status = status
    this.bodyPreview = bodyPreview
  }
}

export interface Aria2Client {
  getVersion(): Promise<Aria2Version>
  addUri(uris: readonly string[], options?: Readonly<Record<string, string>>): Promise<{ gid: string }>
  tellStatus(gid: string): Promise<Aria2DownloadStatus>
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error()
  return value as Record<string, unknown>
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error()
  return value
}

function length(value: unknown): number | null {
  if (value === undefined) return null
  const raw = string(value)
  if (!/^\d+$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error()
  return Number(raw)
}

const fetchTransport: Aria2Transport = request => fetch(request.url, {
  method: 'POST', headers: request.headers, body: request.body, signal: request.signal,
})

/** Create a client. `transport` defaults to a thin wrapper over global fetch. */
export function createAria2Client(config: Aria2Config, transport: Aria2Transport = fetchTransport): Aria2Client {
  const { endpoint, token, timeoutMs } = config
  let id = 0
  const sanitize = (value: string): string => {
    while (token && value.includes(token)) value = value.split(token).join('')
    return value
  }

  async function call<T>(method: string, args: readonly unknown[], parse: (value: unknown) => T): Promise<T> {
    const controller = new AbortController()
    let status = 0
    let body = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Aria2TimeoutError(sanitize(method)))
      }, timeoutMs)
    })
    try {
      const requestId = ++id
      const operation = async (): Promise<T> => {
        const response = await transport({
          url: endpoint,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params: token === null ? args : [`token:${token}`, ...args] }),
          signal: controller.signal,
        })
        status = response.status
        body = await response.text()
        if (!response.ok) throw new Error()
        const envelope = record(JSON.parse(body))
        if (envelope.jsonrpc !== '2.0' || envelope.id !== requestId) throw new Error()
        if (envelope.error !== undefined) {
          const error = record(envelope.error)
          if (error.code === 1) throw new Aria2AuthError(sanitize(method))
          throw new Error()
        }
        return parse(envelope.result)
      }
      return await Promise.race([operation(), deadline])
    } catch (error) {
      if (controller.signal.aborted) throw new Aria2TimeoutError(sanitize(method))
      if (error instanceof Aria2AuthError) throw error
      // Redact before truncation so a token crossing the preview boundary is removed.
      throw new Aria2ProtocolError(sanitize(method), status, sanitize(body).slice(0, 200))
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    getVersion: () => call('aria2.getVersion', [], (value) => {
      const result = record(value)
      const features = result.enabledFeatures ?? []
      if (!Array.isArray(features)) throw new Error()
      return { version: string(result.version), enabledFeatures: features.map(string) }
    }),
    addUri: (uris, options) => call('aria2.addUri', options === undefined ? [uris] : [uris, options], value => ({ gid: string(value) })),
    tellStatus: gid => call('aria2.tellStatus', [gid], (value) => {
      const result = record(value)
      return {
        gid: string(result.gid), status: string(result.status),
        totalLength: length(result.totalLength), completedLength: length(result.completedLength),
        errorMessage: result.errorMessage === undefined ? null : string(result.errorMessage),
      }
    }),
  }
}
