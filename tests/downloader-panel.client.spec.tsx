// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
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
  search: list,
  refresh: async () => ({ ok: true, value: { candidates: [], discovered: 0, known: 0, unsubmittable: 0 } }),
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
  fireEvent.click(screen.getByRole('button', { name: /Example release/ }))
  await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('gid-1') })
  expect(add).toHaveBeenCalledWith('c1')
})

it('shows the error state when the host call fails', async () => {
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: false, error: new RemoteError('gateway/internal', 'x', {}) }))} />)
  expect(await screen.findByText('error')).toBeTruthy()
})

it('shows seeders, leechers, downloads and orders by the clicked column', async () => {
  const older = candidate({ id: 'a', title: 'Older', publishedAt: '2026-11-01T00:00:00.000Z', seeders: 1, leechers: 9, downloads: 100 })
  const newer = candidate({ id: 'b', title: 'Newer', publishedAt: '2026-11-05T00:00:00.000Z', seeders: 50, leechers: 2, downloads: 3 })
  render(<DownloaderPanel t={t} download={namespace(async () => ({ ok: true, value: [older, newer] }))} />)
  await screen.findByText('Newer')
  const titles = () => Array.from(document.querySelectorAll('li button span:first-child')).map(node => node.textContent)
  expect(document.body.textContent).toContain('50')
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

it('B1/B2 renders refresh candidates directly without another list or submission', async () => {
  const list = vi.fn(async () => ({ ok: true as const, value: [candidate()] }))
  const download = namespace(list, vi.fn())
  download.refresh = vi.fn(async () => ({ ok: true as const, value: {
    candidates: [candidate({ id: 'new', title: 'New release' })], discovered: 1, known: 0, unsubmittable: 0,
  } }))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('Example release')
  for (let count = 1; count <= 2; count++) {
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    await waitFor(() => { expect(screen.queryByText('loading')).toBeNull() })
    expect(screen.getByText('New release')).toBeTruthy()
    expect(download.refresh).toHaveBeenCalledTimes(count)
  }
  expect(list).toHaveBeenCalledOnce()
  expect(download.add).not.toHaveBeenCalled()
})

it.each(['result', 'rejection'])('B5 keeps previous candidates and visible error after refresh %s failure', async mode => {
  const list = vi.fn(async () => ({ ok: true as const, value: [candidate()] }))
  const download = namespace(list, vi.fn())
  download.refresh = vi.fn(async () => {
    if (mode === 'rejection') throw new Error('source timeout')
    return { ok: false as const, error: new RemoteError('gateway/internal', 'source failed', {}) }
  })
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('Example release')
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  await screen.findByRole('alert')
  expect(screen.getByText('Example release')).toBeTruthy()
  expect(list).toHaveBeenCalledOnce()
  expect(download.add).not.toHaveBeenCalled()
  download.refresh = vi.fn(async () => ({ ok: true as const, value: {
    candidates: [candidate({ title: 'Recovered' })], discovered: 1, known: 0, unsubmittable: 0,
  } }))
  fireEvent.click(screen.getByRole('button', { name: 'retry' }))
  await screen.findByText('Recovered')
  expect(screen.queryByRole('alert')).toBeNull()
  expect(download.add).not.toHaveBeenCalled()
})

it('B4 refresh passes the executed alpha query despite the beta draft', async () => {
  const download = namespace(vi.fn(async () => ({ ok: true as const, value: [] })), vi.fn())
  download.search = vi.fn(async () => ({ ok: true as const, value: [candidate({ title: 'Alpha result' })] }))
  download.refresh = vi.fn()
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('empty')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alpha' } })
  fireEvent.click(screen.getByRole('button', { name: 'search' }))
  await screen.findByText('Alpha result')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'beta' } })
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  await waitFor(() => { expect(download.search).toHaveBeenCalledTimes(2) })
  expect(vi.mocked(download.search).mock.calls).toEqual([['alpha'], ['alpha']])
  expect(download.refresh).not.toHaveBeenCalled()
  expect(download.list).toHaveBeenCalledOnce()
  expect(download.add).not.toHaveBeenCalled()
})

it('B6 refreshed rows submit only the clicked candidate and retain persisted dedupe', async () => {
  const { createDownloadService } = await import('../src/service.ts')
  const records = new Map<string, string>()
  const selected = candidate()
  const other = candidate({ id: 'other', title: 'Other release', dedupeKey: 'other' })
  const add = vi.fn(async () => ({ gid: 'manual-gid' }))
  const service = createDownloadService({
    source: { listCandidates: async () => [selected, other] },
    downloader: { add, status: async () => ({ state: 'active' }) },
    store: {
      has: key => records.has(key),
      record: (key, gid) => { records.set(key, gid) },
      list: () => [...records].map(([key, gid]) => ({ key, gid })),
    },
  })
  const download: DownloadNamespace = {
    list: async () => ({ ok: true, value: await service.listCandidates() }),
    search: async keyword => ({ ok: true, value: await service.search(keyword) }),
    refresh: async () => ({ ok: true, value: await service.refresh() }),
    add: async id => ({ ok: true, value: await service.add(id) }),
  }
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('Example release')
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  await waitFor(() => { expect(screen.queryByText('loading')).toBeNull() })
  expect(add).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /Example release/ }))
  await screen.findByText('submitted manual-gid')
  fireEvent.click(screen.getByRole('button', { name: /Example release/ }))
  await screen.findByText('alreadySubmitted')
  expect(add.mock.calls).toEqual([[selected]])
  expect([...records]).toEqual([[selected.dedupeKey, 'manual-gid']])
})
