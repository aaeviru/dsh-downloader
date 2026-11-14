// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ConfigPageForm } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { SUKEBEI_CATEGORIES } from '../src/catalog.ts'
import type { SourceKind } from '../src/types.ts'
import { SettingsPage } from '../src/client/SettingsPage.tsx'
import { en, type DownloaderKey } from '../src/client/locales.ts'
import type { DownloadNamespace } from '../src/client/namespace.ts'

afterEach(cleanup)
const t = (key: DownloaderKey): string => en[key]
function fixture(kind: SourceKind = 'sukebei') {
  const value = { endpoint: 'http://127.0.0.1:8082/jsonrpc', qualityFilter: '0' as const, category: '1_1' as const }
  const form = {
    state: { status: 'ready' as const, value, base: {}, user: {}, revision: 7, writable: true },
    mutate: vi.fn<ConfigPageForm['mutate']>(async () => true),
  }
  const download: DownloadNamespace = {
    settingsInfo: vi.fn(async () => ({ ok: true as const, value: { source: { kind, categories: SUKEBEI_CATEGORIES }, effective: value } })),
    testConnection: vi.fn(async () => ({ ok: true as const, value: { ok: true as const, version: '1.36.0' } })),
    preferences: vi.fn(), recordSearch: vi.fn(), toggleFavorite: vi.fn(), deleteSearch: vi.fn(), clearHistory: vi.fn(),
    list: vi.fn(), search: vi.fn(), refresh: vi.fn(), submissions: vi.fn(), resubmit: vi.fn(), add: vi.fn(),
  }
  return { form, download, t }
}
async function page(kind?: SourceKind) {
  const props = fixture(kind)
  render(<SettingsPage view="page" {...props} />)
  await screen.findByLabelText(en.endpoint)
  return props
}
it('loads a one-line summary', async () => {
  const props = fixture()
  const view = render(<SettingsPage view="summary" {...props} />)
  expect(view.container.textContent).toBe('')
  expect(await screen.findByText('127.0.0.1:8082 · No filter · Art — Anime')).toBeTruthy()
})
it('renders the accepted values and all categories', async () => {
  await page()
  expect((screen.getByLabelText(en.endpoint) as HTMLInputElement).value).toBe('http://127.0.0.1:8082/jsonrpc')
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).value).toBe('0')
  const category = screen.getByLabelText(en.category) as HTMLSelectElement
  expect(category.value).toBe('1_1')
  expect(category.options).toHaveLength(10)
})
it('saves only touched fields with the accepted revision and reloads info', async () => {
  const { form, download } = await page()
  fireEvent.change(screen.getByLabelText(en.uploadFilter), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: en.save }))
  await screen.findByText(en.saved)
  expect(form.mutate).toHaveBeenCalledExactlyOnceWith([{ op: 'set', path: ['qualityFilter'], value: '2' }], 7)
  expect(download.settingsInfo).toHaveBeenCalledTimes(2)
})
it('cancels drafts without writing', async () => {
  const { form } = await page()
  fireEvent.change(screen.getByLabelText(en.uploadFilter), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: en.cancel }))
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).value).toBe('0')
  expect(form.mutate).not.toHaveBeenCalled()
})
it('tests a staged endpoint without saving', async () => {
  const { form, download } = await page()
  fireEvent.change(screen.getByLabelText(en.endpoint), { target: { value: 'https://aria.example/jsonrpc' } })
  fireEvent.click(screen.getByRole('button', { name: en.testConnection }))
  await screen.findByText('Connected. aria2 1.36.0.')
  expect(download.testConnection).toHaveBeenCalledExactlyOnceWith('https://aria.example/jsonrpc')
  expect(form.mutate).not.toHaveBeenCalled()
})
it('disables both selects for unknown sources', async () => {
  await page('unknown')
  for (const control of screen.getAllByRole('combobox')) expect((control as HTMLSelectElement).disabled).toBe(true)
  expect(screen.getByText(en.sourceUnsupported)).toBeTruthy()
})
it('disables both selects for Nyaa sources', async () => {
  await page('nyaa')
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).disabled).toBe(true)
  expect((screen.getByLabelText(en.category) as HTMLSelectElement).disabled).toBe(true)
  expect(screen.getByText(en.sourceUnsupported)).toBeTruthy()
})
it('blocks saving and testing an invalid endpoint', async () => {
  const { form } = await page()
  fireEvent.change(screen.getByLabelText(en.endpoint), { target: { value: 'http://user:password@host/jsonrpc' } })
  expect(screen.getByText(en.invalidEndpoint)).toBeTruthy()
  expect((screen.getByRole('button', { name: en.save }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: en.testConnection }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: en.save }))
  expect(form.mutate).not.toHaveBeenCalled()
})
it('renders unavailable when no form is supplied', async () => {
  render(<SettingsPage view="page" t={t} download={fixture().download} />)
  await waitFor(() => { expect(screen.getByText(en.settingsUnavailable)).toBeTruthy() })
})
it.each(['refused', 'rejected'])('keeps drafts after a %s save for retry', async outcome => {
  const { form } = await page()
  if (outcome === 'refused') form.mutate.mockResolvedValueOnce(false)
  else form.mutate.mockRejectedValueOnce(new Error('offline'))
  fireEvent.change(screen.getByLabelText(en.uploadFilter), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: en.save }))
  await screen.findByText(en.saveFailed)
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).value).toBe('2')
  fireEvent.click(screen.getByRole('button', { name: en.save }))
  await screen.findByText(en.saved)
  expect(form.mutate).toHaveBeenCalledTimes(2)
})
it('renders read-only controls', async () => {
  const props = fixture()
  props.form.state.writable = false
  render(<SettingsPage view="page" {...props} />)
  await screen.findByText(en.settingsReadOnly)
  expect((screen.getByLabelText(en.endpoint) as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: en.save }) as HTMLButtonElement).disabled).toBe(true)
})
it('retries settings info after a transport failure', async () => {
  const props = fixture()
  vi.mocked(props.download.settingsInfo).mockRejectedValueOnce(new Error('offline'))
  render(<SettingsPage view="page" {...props} />)
  fireEvent.click(await screen.findByRole('button', { name: en.retry }))
  await screen.findByLabelText(en.endpoint)
  expect(props.download.settingsInfo).toHaveBeenCalledTimes(2)
})
it('uses legacy defaults and preserves touched drafts across accepted updates', async () => {
  const props = fixture()
  const form: ConfigPageForm = { ...props.form, state: { ...props.form.state, value: undefined } }
  const view = render(<SettingsPage {...props} form={form} view="page" />)
  await screen.findByLabelText(en.endpoint)
  expect((screen.getByLabelText(en.category) as HTMLSelectElement).value).toBe('1_1')
  fireEvent.change(screen.getByLabelText(en.uploadFilter), { target: { value: '2' } })
  const updated = { ...form, state: { ...form.state, value: { ...props.form.state.value, qualityFilter: '1' } } }
  view.rerender(<SettingsPage {...props} form={updated} view="page" />)
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).value).toBe('2')
  fireEvent.click(screen.getByRole('button', { name: en.cancel }))
  expect((screen.getByLabelText(en.uploadFilter) as HTMLSelectElement).value).toBe('1')
})
it.each(['invalid', 'auth', 'timeout', 'unreachable', 'protocol'] as const)('reports a %s connection result', async reason => {
  const props = fixture()
  vi.mocked(props.download.testConnection).mockResolvedValue({ ok: true, value: { ok: false, reason } })
  render(<SettingsPage view="page" {...props} />)
  await screen.findByLabelText(en.endpoint)
  fireEvent.click(screen.getByRole('button', { name: en.testConnection }))
  const keys = { invalid: 'invalidEndpoint', auth: 'testAuth', timeout: 'testTimeout', unreachable: 'testUnreachable', protocol: 'testProtocol' } as const
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', en[keys[reason]])
  expect(props.form.mutate).not.toHaveBeenCalled()
})
