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

it('shows seeders, leechers, downloads and orders by the clicked column', async () => {
  const older = candidate({ id: 'a', title: 'Older', publishedAt: '2026-11-01T00:00:00.000Z', seeders: 1, leechers: 9, downloads: 100 })
  const newer = candidate({ id: 'b', title: 'Newer', publishedAt: '2026-11-05T00:00:00.000Z', seeders: 50, leechers: 2, downloads: 3 })
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: true, value: [older, newer] }))} />)
  await screen.findByText('Newer')
  const titles = () => Array.from(document.querySelectorAll('li span:first-child')).map(node => node.textContent)
  expect(document.body.textContent).toContain('seeders: 50')
  expect(titles()[0]).toBe('Newer')
  fireEvent.click(screen.getByRole('button', { name: /seeders/i }))
  expect(titles()[0]).toBe('Newer')
  fireEvent.click(screen.getByRole('button', { name: /seeders/i }))
  expect(titles()[0]).toBe('Older')
})

it('renders the publication date in Japan time as year-month-day', async () => {
  const evening = candidate({ id: 'jst', publishedAt: '2026-11-05T20:30:00.000Z' })
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: true, value: [evening] }))} />)
  await screen.findByText('Example release')
  expect(document.body.textContent).toContain('2026年11月6日')
})
