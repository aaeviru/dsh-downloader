import { expect, it } from 'vitest'
import { Aria2ProtocolError, createAria2Client } from '../src/aria2.ts'

it('limits a multi-byte response preview to 200 UTF-8 bytes', async () => {
  const client = createAria2Client({ endpoint: 'https://example.test/jsonrpc', token: null, timeoutMs: 1000 }, async () => ({
    ok: false, status: 500, text: async () => 'é'.repeat(125),
  }))
  const error = await client.getVersion().catch((error: unknown) => error)
  expect(error).toBeInstanceOf(Aria2ProtocolError)
  if (!(error instanceof Aria2ProtocolError)) throw new Error('Expected a protocol error')
  expect(error.bodyPreview).toBe('é'.repeat(100))
  expect(Buffer.byteLength(error.bodyPreview, 'utf8')).toBeLessThanOrEqual(200)
})
