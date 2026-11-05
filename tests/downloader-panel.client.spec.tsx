// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Candidate } from '../src/types.ts'
import { afterEach, expect, it, vi } from 'vitest'
import { DownloaderPanel } from '../src/client/DownloaderPanel.tsx'
import type { DownloadNamespace } from '../src/client/namespace.ts'
import type { DownloaderKey } from '../src/client/locales.ts'

afterEach(cleanup)
const t = (key: DownloaderKey): string => key === 'submitted' ? 'submitted {gid}' : key

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: 'c1', sourceId: 's', title: 'Example release', publishedAt: null, infoHash: null,
  magnetUri: null, torrentUrl: 'https://example.test/a.torrent', sizeBytes: 1024 ** 3,
  sourceUrl: 'https://example.test/a', submittable: true, dedupeKey: 'ih:x', ...overrides,
})

const namespace = (list: DownloadNamespace['list'], add?: DownloadNamespace['add']): DownloadNamespace => ({
  list,
  refresh: async () => ({ ok: true, value: { discovered: 0, added: 0, skipped: 0, unsubmittable: 0 } }),
  add: add ?? (async () => ({ ok: true, value: { gid: 'g1' } })),
})

it('shows the loading state before candidates resolve', () => {
  render(<DownloaderPanel t={t} download={namespace(() => new Promise(() => {}))} />)
  expect(screen.getByText('loading')).toBeTruthy()
})

it('shows the empty state when the host returns no candidates', async () => {
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: true, value: [] }))} />)
  expect(await screen.findByText('empty')).toBeTruthy()
})

it('lists candidates and submits one, showing the returned gid', async () => {
  const add = vi.fn(async () => ({ ok: true as const, value: { gid: 'gid-1' } }))
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: true, value: [candidate()] }), add)} />)
  expect(await screen.findByText('Example release')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'submit' }))
  await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('gid-1') })
  expect(add).toHaveBeenCalledWith('c1')
})

it('shows the error state when the host call fails', async () => {
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: false, error: { code: 'x', message: 'x' } }))} />)
  expect(await screen.findByText('error')).toBeTruthy()
})
