import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Aria2AuthError, Aria2Error, Aria2ProtocolError, Aria2TimeoutError, createAria2Client } from '../src/aria2.ts'
import type { Aria2Transport } from '../src/aria2.ts'

/** All HTTP traffic terminates at this loopback stub. */
describe('aria2', () => {
  let endpoint: string
  let requests: unknown[]
  let respond: (response: ServerResponse, id: number) => void
  const server = createServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => { body += chunk })
    request.on('end', () => {
      const parsed: unknown = JSON.parse(body)
      if (typeof parsed !== 'object' || parsed === null || !('id' in parsed) || typeof parsed.id !== 'number') throw new Error('Invalid request')
      requests.push(parsed)
      expect(request.method).toBe('POST')
      expect(request.url).toBe('/jsonrpc')
      expect(request.headers['content-type']).toBe('application/json')
      respond(response, parsed.id)
    })
  })
  const result = (value: unknown) => {
    respond = (response, id) => response.end(JSON.stringify({ jsonrpc: '2.0', id, result: value }))
  }
  const rpcError = (code: number, message = 'Unauthorized') => {
    respond = (response, id) => response.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }))
  }
  const client = (token: string | null = null, timeoutMs = 1000, transport?: Aria2Transport) =>
    createAria2Client({ endpoint, token, timeoutMs }, transport)
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject)
        resolve()
      })
    })
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing stub address')
    endpoint = `http://127.0.0.1:${address.port}/jsonrpc`
  })
  afterAll(async () => {
    if (!server.listening) return
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => { if (error) reject(error); else resolve() }))
  })
  beforeEach(() => {
    requests = []
    result({ version: '1.37', enabledFeatures: ['BitTorrent'] })
  })

  it('getVersion maps version and enabledFeatures', async () => {
    expect(await client().getVersion()).toEqual({ version: '1.37', enabledFeatures: ['BitTorrent'] })
    result({ version: '1.36' })
    expect(await client().getVersion()).toEqual({ version: '1.36', enabledFeatures: [] })
  })
  it('addUri returns gid and sends the exact body with options and increasing ids', async () => {
    result('gid')
    const api = client('secret')
    expect(await api.addUri(['magnet:?xt=test'], { dir: '/downloads' })).toEqual({ gid: 'gid' })
    await api.addUri(['second'])
    expect(requests).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'aria2.addUri', params: ['token:secret', ['magnet:?xt=test'], { dir: '/downloads' }] },
      { jsonrpc: '2.0', id: 2, method: 'aria2.addUri', params: ['token:secret', ['second']] },
    ])
  })
  it('tellStatus maps lengths and missing fields', async () => {
    result({ gid: 'g', status: 'active', totalLength: '100', completedLength: '0', errorMessage: 'detail' })
    expect(await client().tellStatus('g')).toEqual({ gid: 'g', status: 'active', totalLength: 100, completedLength: 0, errorMessage: 'detail' })
    expect(requests[0]).toEqual({ jsonrpc: '2.0', id: 1, method: 'aria2.tellStatus', params: ['g'] })
    result({ gid: 'g', status: 'waiting' })
    expect(await client().tellStatus('g')).toEqual({ gid: 'g', status: 'waiting', totalLength: null, completedLength: null, errorMessage: null })
  })
  it('Unauthorized maps to Aria2AuthError', async () => {
    rpcError(1)
    await expect(client().getVersion()).rejects.toBeInstanceOf(Aria2AuthError)
  })
  it('timeout maps to Aria2TimeoutError', async () => {
    respond = (response) => { setTimeout(() => response.end('{}'), 100) }
    await expect(client(null, 30).getVersion()).rejects.toBeInstanceOf(Aria2TimeoutError)
    await delay(120)
  })
  it('HTTP 500 carries status and a 200-character preview', async () => {
    respond = (response) => { response.statusCode = 500; response.end('x'.repeat(250)) }
    await expect(client().getVersion()).rejects.toMatchObject({ status: 500, bodyPreview: 'x'.repeat(200) })
    await expect(client().getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
  })
  it('non-JSON HTTP 200 maps to Aria2ProtocolError', async () => {
    respond = response => response.end('not JSON')
    await expect(client().getVersion()).rejects.toMatchObject({ status: 200, bodyPreview: 'not JSON' })
    await expect(client().getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
  })
  it('null token omits the token entry and empty string', async () => {
    await client().getVersion()
    result('g')
    await client().addUri(['uri'])
    expect(requests).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'aria2.getVersion', params: [] },
      { jsonrpc: '2.0', id: 1, method: 'aria2.addUri', params: [['uri']] },
    ])
  })
  it('addUri timeout sends exactly one request without retries', async () => {
    respond = (response) => { setTimeout(() => response.end('{}'), 100) }
    await expect(client(null, 30).addUri(['uri'])).rejects.toBeInstanceOf(Aria2TimeoutError)
    await delay(150)
    expect(requests).toHaveLength(1)
  })
  it('token never appears in errors, previews, or serialized client', async () => {
    const token = 'private-secret'
    const api = client(token)
    expect(JSON.stringify(api)).toBe('{}')
    for (const code of [1, 2]) {
      rpcError(code, token)
      const error = await api.getVersion().catch((error: unknown) => error)
      expect(error).toBeInstanceOf(Aria2Error)
      expect(JSON.stringify(error)).not.toContain(token)
      expect(String(error)).not.toContain(token)
    }
    respond = (response) => { response.statusCode = 500; response.end('x'.repeat(195) + token) }
    await expect(api.getVersion()).rejects.toMatchObject({ message: 'aria2.getVersion', bodyPreview: 'x'.repeat(195) })
    respond = response => response.end('aabb')
    await expect(client('ab').getVersion()).rejects.toMatchObject({ bodyPreview: '' })
  })
  it('injected transport receives the request and abort signal', async () => {
    const transport: Aria2Transport = (request) => {
      expect(request.signal).toBeInstanceOf(AbortSignal)
      expect(request.url).toBe(endpoint)
      return fetch(request.url, { method: 'POST', ...request })
    }
    expect(await client('', 1000, transport).getVersion()).toMatchObject({ version: '1.37' })
    expect(requests[0]).toMatchObject({ params: [] })
  })
  it('transport rejection has status zero and does not expose its error', async () => {
    respond = response => response.destroy()
    await expect(client().getVersion()).rejects.toMatchObject({ status: 0, bodyPreview: '' })
    const transport: Aria2Transport = async () => { throw new Error('private-secret') }
    await expect(client('private-secret', 1000, transport).getVersion()).rejects.toMatchObject({ message: 'aria2.getVersion', status: 0, bodyPreview: '' })
  })
  it('timeout includes response body consumption', async () => {
    respond = (response) => {
      response.writeHead(200)
      response.write('{')
      setTimeout(() => response.end('}'), 100)
    }
    await expect(client(null, 30).getVersion()).rejects.toBeInstanceOf(Aria2TimeoutError)
    await delay(120)
  })
  it('invalid envelopes and results are protocol errors', async () => {
    for (const envelope of [null, [], 1, {}, { jsonrpc: '1.0' }, { jsonrpc: '2.0', id: 99 }, { jsonrpc: '2.0', id: 1, error: null }]) {
      respond = response => response.end(JSON.stringify(envelope))
      await expect(client().getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
    }
    for (const value of [null, {}, { version: 1 }, { version: 'v', enabledFeatures: 3 }, { version: 'v', enabledFeatures: [3] }]) {
      result(value)
      await expect(client().getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
    }
    result(3)
    await expect(client().addUri([])).rejects.toBeInstanceOf(Aria2ProtocolError)
    for (const totalLength of ['bad', '9'.repeat(400), 1]) {
      result({ gid: 'g', status: 'active', totalLength })
      await expect(client().tellStatus('g')).rejects.toBeInstanceOf(Aria2ProtocolError)
    }
  })
})
