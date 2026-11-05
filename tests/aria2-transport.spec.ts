import { expect, it } from 'vitest'
import { Aria2AuthError, Aria2ProtocolError, Aria2TimeoutError, createAria2Client } from '../src/aria2.ts'

function client(result: unknown, token: string | null = null, envelope = false) {
  return createAria2Client({ endpoint: 'test', token, timeoutMs: 10 }, async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify(envelope ? result : { jsonrpc: '2.0', id: 1, result }),
  }))
}

it('maps versions, options, lengths and details without a listening server', async () => {
  expect(await client({ version: 'v', enabledFeatures: ['BitTorrent'] }).getVersion()).toEqual({
    version: 'v', enabledFeatures: ['BitTorrent'],
  })
  expect(await client({ version: 'v' }, '').getVersion()).toEqual({ version: 'v', enabledFeatures: [] })
  expect(await client('gid').addUri(['uri'], { dir: '/downloads' })).toEqual({ gid: 'gid' })
  expect(await client({ gid: 'g', status: 'active', totalLength: '100', completedLength: '0', errorMessage: 'detail' })
    .tellStatus('g')).toEqual({ gid: 'g', status: 'active', totalLength: 100, completedLength: 0, errorMessage: 'detail', followedBy: [] })
})

it('validates envelopes, results and lengths', async () => {
  for (const envelope of [null, [], 1, {}, { jsonrpc: '1.0' }, { jsonrpc: '2.0', id: 99 }, { jsonrpc: '2.0', id: 1, error: null }]) {
    await expect(client(envelope, null, true).getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
  }
  for (const value of [null, {}, { version: 1 }, { version: 'v', enabledFeatures: 3 }, { version: 'v', enabledFeatures: [3] }]) {
    await expect(client(value).getVersion()).rejects.toBeInstanceOf(Aria2ProtocolError)
  }
  for (const totalLength of ['bad', '9'.repeat(400), 1]) {
    await expect(client({ gid: 'g', status: 'active', totalLength }).tellStatus('g')).rejects.toBeInstanceOf(Aria2ProtocolError)
  }
})

it('redacts errors, handles authentication, and times out a transport', async () => {
  for (const code of [1, 2]) {
    const error = await client({ jsonrpc: '2.0', id: 1, error: { code, message: 'secret' } }, 'secret', true)
      .getVersion().catch((error: unknown) => error)
    expect(error).toBeInstanceOf(code === 1 ? Aria2AuthError : Aria2ProtocolError)
    expect(JSON.stringify(error)).not.toContain('secret')
  }
  const api = createAria2Client({ endpoint: 'test', token: null, timeoutMs: 1 }, () => new Promise(() => {}))
  await expect(api.getVersion()).rejects.toBeInstanceOf(Aria2TimeoutError)
})
