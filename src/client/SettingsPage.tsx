import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { QUALITY_FILTERS } from '../catalog.ts'
import type { SettingsInfo } from '../types.ts'
import type { DownloaderKey } from './locales.ts'
import type { DownloadNamespace } from './namespace.ts'

type Translate = (key: DownloaderKey) => string
type Draft = { endpoint: string; qualityFilter: string; category: string }
type Field = keyof Draft

/** Prefer accepted fields, falling back to the resolved legacy feed settings. */
function readDraft(value: Record<string, unknown> | undefined, info: SettingsInfo): Draft {
  const field = (key: Field): string => typeof value?.[key] === 'string' ? value[key] : info.effective[key]
  return { endpoint: field('endpoint'), qualityFilter: field('qualityFilter'), category: field('category') }
}

/** Configuration contributed only to the downloader's row on the Plugins page. */
export function SettingsPage({ view, form, t, download }: PluginConfigViewProps & { t: Translate; download: DownloadNamespace }) {
  const id = useId()
  const [info, setInfo] = useState<SettingsInfo>()
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>({ endpoint: '', qualityFilter: '0', category: '0_0' })
  const touched = useRef(new Set<Field>())
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean }>()
  const [testMessage, setTestMessage] = useState<{ text: string; error: boolean }>()
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await download.settingsInfo()
      if (!result.ok) throw result.error
      setInfo(result.value)
    } catch { setLoadError(true) } finally { setLoading(false) }
  }, [download])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (info && touched.current.size === 0) setDraft(readDraft(form?.state.value, info))
  }, [form?.state.value, info])

  const valid = /^https?:\/\/[^@/?#\s]+(?:\/[^\s]*)?$/.test(draft.endpoint)
  const editable = form?.state.status === 'ready' && form.state.writable
  function change(field: Field, value: string) {
    touched.current.add(field)
    setDraft(previous => ({ ...previous, [field]: value }))
    setMessage(undefined)
    setTestMessage(undefined)
  }
  async function save() {
    if (!form || !editable || saving || !valid || touched.current.size === 0) return
    const ops = [...touched.current].map(field => ({ op: 'set' as const, path: [field], value: draft[field] }))
    setSaving(true)
    try {
      if (await form.mutate(ops, form.state.revision)) {
        touched.current.clear()
        setMessage({ text: t('saved'), error: false })
        await load()
      } else setMessage({ text: t('saveFailed'), error: true })
    } catch { setMessage({ text: t('saveFailed'), error: true }) } finally { setSaving(false) }
  }
  async function test() {
    if (testing || !valid) return
    setTesting(true)
    setTestMessage(undefined)
    try {
      const result = await download.testConnection(draft.endpoint)
      if (!result.ok) throw result.error
      const value = result.value
      const reasons = { invalid: 'invalidEndpoint', auth: 'testAuth', timeout: 'testTimeout', unreachable: 'testUnreachable', protocol: 'testProtocol' } as const
      setTestMessage({ text: value.ok ? t('testSucceeded').replace('{version}', value.version) : t(reasons[value.reason]), error: !value.ok })
    } catch { setTestMessage({ text: t('testUnreachable'), error: true }) } finally { setTesting(false) }
  }
  if (view === 'summary') {
    if (!info || loading || loadError) return null
    const current = readDraft(form?.state.value, info)
    let host = current.endpoint
    try { host = new URL(current.endpoint).host } catch { /* Show the supplied endpoint if malformed. */ }
    const category = info.source.categories.find(option => option.code === current.category)
    return <span>{host} · {t(`filter${current.qualityFilter}` as DownloaderKey)} · {category ? t(category.label as DownloaderKey) : current.category}</span>
  }
  if (!form || form.state.status === 'unavailable') return <p role="status">{t('settingsUnavailable')}</p>
  if (form.state.status === 'loading' || (!info && loading)) return <p role="status">{t('settingsLoading')}</p>
  if (!info || loadError) return <div role="alert">{t('settingsUnavailable')} <button type="button" disabled={loading} onClick={() => { void load() }}>{t('retry')}</button></div>
  return <section style={{ padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }}>
    <h2>{t('settings')}</h2>
    {!form.state.writable && <p role="status">{t('settingsReadOnly')}</p>}
    <div style={{ display: 'grid', gap: 8 }}>
      <label htmlFor={`${id}-filter`}>{t('uploadFilter')}</label>
      <select id={`${id}-filter`} value={draft.qualityFilter} disabled={!editable || saving || info.source.kind !== 'sukebei'} onChange={event => { change('qualityFilter', event.target.value) }}>
        {QUALITY_FILTERS.map(filter => <option key={filter} value={filter}>{t(`filter${filter}`)}</option>)}
      </select>
      <label htmlFor={`${id}-category`}>{t('category')}</label>
      <select id={`${id}-category`} value={draft.category} disabled={!editable || saving || info.source.kind !== 'sukebei'} onChange={event => { change('category', event.target.value) }}>
        {info.source.categories.map(option => <option key={option.code} value={option.code}>{t(option.label as DownloaderKey)}</option>)}
      </select>
      {info.source.kind !== 'sukebei' && <p role="status">{t('sourceUnsupported')}</p>}
      <label htmlFor={`${id}-endpoint`}>{t('endpoint')}</label>
      <input id={`${id}-endpoint`} type="text" value={draft.endpoint} disabled={!editable || saving || testing} aria-invalid={!valid} aria-describedby={`${id}-hint${valid ? '' : ` ${id}-invalid`}`} onChange={event => { change('endpoint', event.target.value) }} />
      <p id={`${id}-hint`} style={{ color: 'var(--dsw-alias-label-secondary)' }}>{t('endpointHelp')}</p>
      {!valid && <p id={`${id}-invalid`} role="alert">{t('invalidEndpoint')}</p>}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" disabled={testing || !valid} onClick={() => { void test() }}>{t(testing ? 'testing' : 'testConnection')}</button>
      <button type="button" disabled={!editable || saving || touched.current.size === 0 || !valid} onClick={() => { void save() }}>{t(saving ? 'saving' : 'save')}</button>
      <button type="button" disabled={saving || testing} onClick={() => {
        touched.current.clear()
        setDraft(readDraft(form.state.value, info))
        setMessage(undefined)
        setTestMessage(undefined)
      }}>{t('cancel')}</button>
    </div>
    {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {testMessage && <p role={testMessage.error ? 'alert' : 'status'}>{testMessage.text}</p>}
  </section>
}
