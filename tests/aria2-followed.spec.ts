import { expect, it } from 'vitest'
import { Aria2ProtocolError, createAria2Client } from '../src/aria2.ts'

it.each([undefined, [], ['real-gid']])('maps followedBy %j', async (followedBy) => {
  const client = createAria2Client({ endpoint: 'test', token: null, timeoutMs: 1000 }, async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: { gid: 'torrent', status: 'complete', followedBy } }),
  }))
  expect((await client.tellStatus('torrent')).followedBy).toEqual(followedBy ?? [])
})

it.each([null, 'gid', [1]])('rejects invalid followedBy %j', async (followedBy) => {
  const client = createAria2Client({ endpoint: 'test', token: null, timeoutMs: 1000 }, async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: { gid: 'torrent', status: 'complete', followedBy } }),
  }))
  await expect(client.tellStatus('torrent')).rejects.toBeInstanceOf(Aria2ProtocolError)
})
