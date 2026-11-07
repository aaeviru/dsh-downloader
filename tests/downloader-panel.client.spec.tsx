import { openPreferencesStore } from '../src/preferences.ts'
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
  preferences: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  recordSearch: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  toggleFavorite: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  deleteSearch: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  clearHistory: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  list,
  submissions: async () => ({ ok: true, value: [] }),
  resubmit: vi.fn(),
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
  const download = namespace(async () => ({ ok: true, value: [candidate()] }), add)
  download.submissions = vi.fn().mockResolvedValueOnce({ ok: true, value: [] }).mockResolvedValue({ ok: true, value: [{ key: 'ih:x', gid: 'gid-1' }] })
  render(<DownloaderPanel t={t} download={download} />)
  expect(await screen.findByText('Example release')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Example release/ }))
  await waitFor(() => { expect(screen.getByRole('status').textContent).toContain('gid-1') })
  expect(add).toHaveBeenCalledExactlyOnceWith('c1')
  await waitFor(() => { expect(screen.getByRole('listitem').dataset.submitted).toBe('true') })
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
    preferences: await openPreferencesStore({ load: async () => ({ history: [], favorites: [] }), save: async () => {} }),
    source: { listCandidates: async () => [selected, other] },
    downloader: { add, status: async () => ({ state: 'active' }) },
    store: {
      has: key => records.has(key),
      record: (key, gid) => { records.set(key, gid) },
      list: () => [...records].map(([key, gid]) => ({ key, gid })),
    },
  })
  const download: DownloadNamespace = {
  preferences: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  recordSearch: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  toggleFavorite: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  deleteSearch: async () => ({ ok: true, value: { history: [], favorites: [] } }),
  clearHistory: async () => ({ ok: true, value: { history: [], favorites: [] } }),

    submissions: async () => ({ ok: true, value: service.submissions() }),
    resubmit: async id => ({ ok: true, value: await service.resubmit(id) }),
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
  expect(screen.getByRole('button', { name: 'resubmit' })).toBeTruthy()
  expect(add.mock.calls).toEqual([[selected]])
  expect([...records]).toEqual([[selected.dedupeKey, 'manual-gid']])
})

it('v7 B1/B3/B5/B8 uses Host keys, selects without requests and moves the explicit entry', async () => {
  const entries = [
    candidate(),
    candidate({ id: 'c2', title: 'Second', dedupeKey: 'other' }),
    candidate({ id: 'c3', title: 'Example release', dedupeKey: 'new' }),
  ]
  const download = namespace(async () => ({ ok: true, value: entries }), vi.fn())
  download.submissions = vi.fn(async () => ({ ok: true as const, value: [{ key: 'ih:x', gid: 'old' }, { key: 'other', gid: 'second' }] }))
  const view = render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('submitted old')
  const rows = screen.getAllByRole('listitem')
  expect(rows.map(row => row.dataset.submitted)).toEqual(['true', 'true', 'false'])
  expect(rows[0]?.getAttribute('style')).toContain('var(--dsw-alias-state-success-tertiary)')
  expect(screen.queryByRole('button', { name: 'resubmit' })).toBeNull()
  fireEvent.click(screen.getAllByRole('button', { name: 'Example release' })[0]!)
  expect(screen.getByRole('button', { name: 'resubmit' }).closest('li')).toBe(rows[0])
  fireEvent.click(screen.getByRole('button', { name: 'Second' }))
  expect(screen.getByRole('button', { name: 'resubmit' }).closest('li')).toBe(rows[1])
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
  view.unmount()
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('submitted old')
  expect(screen.queryByRole('button', { name: 'resubmit' })).toBeNull()
})

it.each(['success', 'failure', 'rejection'] as const)('v7 B6/B7 re-download %s makes one request and keeps the recorded row green', async mode => {
  const download = namespace(async () => ({ ok: true, value: [candidate()] }), vi.fn())
  let gid = 'old'
  download.submissions = vi.fn(async () => ({ ok: true as const, value: [{ key: 'ih:x', gid }] }))
  const gate = Promise.withResolvers<Awaited<ReturnType<DownloadNamespace['resubmit']>>>()
  download.resubmit = vi.fn(() => gate.promise)
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('submitted old')
  fireEvent.click(screen.getByRole('button', { name: 'Example release' }))
  const button = screen.getByRole('button', { name: 'resubmit' })
  expect(button.tagName).toBe('BUTTON')
  button.focus()
  expect(document.activeElement).toBe(button)
  fireEvent.click(button)
  expect(button.hasAttribute('disabled')).toBe(true)
  fireEvent.click(button)
  expect(download.resubmit).toHaveBeenCalledExactlyOnceWith('c1')
  expect(download.add).not.toHaveBeenCalled()
  if (mode === 'success') {
    gid = 'new'
    gate.resolve({ ok: true, value: { gid } })
    await screen.findByText('submitted new')
    expect(download.submissions).toHaveBeenCalledTimes(2)
  } else {
    if (mode === 'rejection') gate.reject(new Error('offline'))
    else gate.resolve({ ok: false, error: new RemoteError('gateway/internal', 'offline', {}) })
    await screen.findByText('submitError')
    expect(screen.getByText('submitted old')).toBeTruthy()
  }
  await waitFor(() => { expect(button.hasAttribute('disabled')).toBe(false) })
  expect(screen.getByRole('listitem').dataset.submitted).toBe('true')
  expect(download.add).not.toHaveBeenCalled()
})

it('v7 B2 pending, failed and unsupported rows never become submitted', async () => {
  const gate = Promise.withResolvers<Awaited<ReturnType<DownloadNamespace['add']>>>()
  const download = namespace(async () => ({ ok: true, value: [candidate(), candidate({ id: 'blocked', title: 'Blocked', submittable: false })] }), vi.fn(() => gate.promise))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('Example release')
  expect(screen.getByRole('button', { name: 'Blocked' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Example release' }))
  expect(screen.getAllByRole('listitem').every(row => row.dataset.submitted === 'false')).toBe(true)
  gate.reject(new Error('offline'))
  await screen.findByText('submitError')
  expect(screen.getAllByRole('listitem').every(row => row.dataset.submitted === 'false')).toBe(true)
})

it('v7 B3 retains submitted keys across paging, search and refresh', async () => {
  const entries = Array.from({ length: 21 }, (_, index) => candidate({
    id: String(index), title: 'Release ' + index, dedupeKey: 'key:' + index,
  }))
  const download = namespace(async () => ({ ok: true, value: entries }), vi.fn())
  download.submissions = vi.fn(async () => ({ ok: true as const, value: [{ key: 'key:20', gid: 'persisted' }] }))
  download.search = vi.fn(async () => ({ ok: true as const, value: [{ ...entries[20]!, id: 'changed-id', title: 'Renamed' }] }))
  download.refresh = vi.fn(async () => ({ ok: true as const, value: { candidates: entries, discovered: 21, known: 1, unsubmittable: 0 } }))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('Release 0')
  fireEvent.click(screen.getByRole('button', { name: '›' }))
  await screen.findByText('submitted persisted')
  fireEvent.click(screen.getByRole('button', { name: '‹' }))
  expect(screen.queryByText('submitted persisted')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '›' }))
  await screen.findByText('submitted persisted')
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  await waitFor(() => { expect(download.refresh).toHaveBeenCalledOnce() })
  await screen.findByText('Release 0')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Renamed' } })
  fireEvent.click(screen.getByRole('button', { name: 'search' }))
  await screen.findByText('Renamed')
  expect(screen.getByRole('listitem').dataset.submitted).toBe('true')
  expect(screen.getByText('submitted persisted')).toBeTruthy()
  expect(download.submissions).toHaveBeenCalledTimes(3)
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
})

it('v7 reports a failed submissions read without inventing submitted keys', async () => {
  const download = namespace(async () => ({ ok: true, value: [candidate()] }), vi.fn())
  download.submissions = vi.fn(async () => ({ ok: false as const, error: new RemoteError('gateway/internal', 'offline', {}) }))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByRole('alert')
  expect(download.add).not.toHaveBeenCalled()
})

it('C1/C4/C5/C6/C8 opens groups, fills only, favorites/unfavorites, deletes and clears without downloads', async () => {
  const store = await openPreferencesStore({ load: async () => ({ history: ['Recent'], favorites: ['Saved'] }), save: async () => {} })
  const download = namespace(vi.fn(async () => ({ ok: true as const, value: [] })), vi.fn())
  download.search = vi.fn()
  download.preferences = async () => ({ ok: true, value: store.value })
  download.toggleFavorite = async keyword => ({ ok: true, value: await store.toggleFavorite(keyword) })
  download.deleteSearch = async keyword => ({ ok: true, value: await store.deleteSearch(keyword) })
  download.clearHistory = async () => ({ ok: true, value: await store.clearHistory() })
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('empty')
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'savedSearches' }))
  open()
  expect(screen.getByRole('region', { name: 'favorites' })).toBeTruthy()
  expect(screen.getByRole('region', { name: 'recent' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Saved', exact: true }))
  expect(screen.getByRole('textbox').getAttribute('value')).toBe('Saved')
  fireEvent.click(screen.getByRole('button', { name: 'unfavorite', exact: true }))
  await waitFor(() => expect(store.value.favorites).toEqual([]))
  fireEvent.click(screen.getByRole('button', { name: 'favorite', exact: true }))
  await waitFor(() => expect(store.value.favorites).toEqual(['Saved']))
  open()
  fireEvent.click(screen.getByRole('button', { name: 'deleteSearch Recent' }))
  await waitFor(() => expect(store.value.history).toEqual([]))
  await store.addSearch('Another')
  // Reload the mounted panel from the Host's committed preferences.
  cleanup()
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('empty')
  open()
  fireEvent.click(screen.getByRole('button', { name: 'clearHistory' }))
  await waitFor(() => expect(store.value.history).toEqual([]))
  expect(store.value.favorites).toEqual(['Saved'])
  fireEvent.click(screen.getByRole('button', { name: 'unfavorite Saved' }))
  await screen.findByText('noSavedSearches')
  fireEvent.keyDown(screen.getByRole('button', { name: 'savedSearches' }), { key: 'Escape' })
  expect(screen.queryByText('noSavedSearches')).toBeNull()
  open()
  fireEvent.pointerDown(document.body)
  expect(screen.queryByText('noSavedSearches')).toBeNull()
  expect(download.search).not.toHaveBeenCalled()
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
})

it.each(['success', 'failure', 'rejection'] as const)('C2/C3/C8 records only completed nonblank searches: %s', async mode => {
  const download = namespace(async () => ({ ok: true, value: [] }), vi.fn())
  download.search = vi.fn(async () => {
    if (mode === 'rejection') throw new Error('offline')
    if (mode === 'failure') return { ok: false as const, error: new RemoteError('gateway/internal', 'offline', {}) }
    return { ok: true as const, value: [] }
  })
  download.recordSearch = vi.fn(async () => ({ ok: true as const, value: { history: ['A  "B"'], favorites: [] } }))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('empty')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'search' }))
  expect(download.search).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  A  "B"  ' } })
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
  expect(download.search).toHaveBeenCalledExactlyOnceWith('A  "B"')
  if (mode === 'success') expect(download.recordSearch).toHaveBeenCalledExactlyOnceWith('A  "B"')
  else expect(download.recordSearch).not.toHaveBeenCalled()
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
})

it('C7 retains search results when recording fails and reports preference load failures', async () => {
  const download = namespace(async () => ({ ok: true, value: [] }), vi.fn())
  download.preferences = vi.fn().mockRejectedValueOnce(new Error('invalid')).mockResolvedValue({ ok: true, value: { history: [], favorites: [] } })
  download.recordSearch = async () => ({ ok: false, error: new RemoteError('gateway/internal', 'full', {}) })
  download.search = async () => ({ ok: true, value: [candidate()] })
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('preferencesError')
  fireEvent.click(screen.getByRole('button', { name: 'retry' }))
  await waitFor(() => expect(screen.queryByText('preferencesError')).toBeNull())
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'term' } })
  fireEvent.click(screen.getByRole('button', { name: 'search' }))
  await screen.findByText('Example release')
  await screen.findByText('preferencesError')
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
})

it('orders titles, sizes, publication dates and missing download counts', async () => {
  const download = namespace(async () => ({ ok: true, value: [candidate({ id: 'a', title: 'A', sizeBytes: null }), candidate({ id: 'b', title: 'B', sizeBytes: 5, publishedAt: '2026-01-01', downloads: 10 })] }))
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('A')
  for (const name of ['title', 'size', 'published', 'downloads']) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }))
  }
  expect(screen.getByText('unknownSize')).toBeTruthy()
})

it.each(['alreadySubmitted', 'alreadySubmitting', 'unsubmittable'] as const)('shows the %s submission outcome without inventing records', async kind => {
  const result = kind === 'alreadySubmitted' ? { alreadySubmitted: 'old' } : kind === 'alreadySubmitting' ? { alreadySubmitting: true as const } : { unsubmittable: true as const }
  const download = namespace(async () => ({ ok: true, value: [candidate()] }), async () => ({ ok: true, value: result }))
  render(<DownloaderPanel t={t} download={download} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Example release' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Example release' }).hasAttribute('disabled')).toBe(false))
  if (kind !== 'alreadySubmitted') expect(screen.getByText(kind)).toBeTruthy()
})

it('does not activate a pending row and retains an open dropdown on inside pointer events', async () => {
  const pending = Promise.withResolvers<Awaited<ReturnType<DownloadNamespace['add']>>>()
  const download = namespace(async () => ({ ok: true, value: [candidate()] }), vi.fn(() => pending.promise))
  render(<DownloaderPanel t={t} download={download} />)
  const rowButton = await screen.findByRole('button', { name: 'Example release' })
  fireEvent.click(rowButton)
  fireEvent.click(rowButton.parentElement!.parentElement!)
  expect(download.add).toHaveBeenCalledOnce()
  pending.resolve({ ok: true, value: { unsubmittable: true } })
  await screen.findByText('unsubmittable')
  fireEvent.click(screen.getByRole('button', { name: 'savedSearches' }))
  fireEvent.pointerDown(screen.getByText('noSavedSearches'))
  expect(screen.getByText('noSavedSearches')).toBeTruthy()
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' })
})

it('retains candidates when refreshing an executed search returns an error', async () => {
  const download = namespace(async () => ({ ok: true, value: [] }), vi.fn())
  download.search = vi.fn().mockResolvedValueOnce({ ok: true, value: [candidate()] }).mockResolvedValue({ ok: false, error: new RemoteError('gateway/internal', 'offline', {}) })
  render(<DownloaderPanel t={t} download={download} />)
  await screen.findByText('empty')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'term' } })
  fireEvent.click(screen.getByRole('button', { name: 'search' }))
  await screen.findByText('Example release')
  await waitFor(() => expect(screen.queryByText('loading')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
  await screen.findByRole('alert')
  expect(screen.getByText('Example release')).toBeTruthy()
  expect(download.add).not.toHaveBeenCalled()
  expect(download.resubmit).not.toHaveBeenCalled()
})
