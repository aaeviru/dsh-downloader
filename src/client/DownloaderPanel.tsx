import { useCallback, useEffect, useState } from 'react'
import type { Candidate } from '../types.ts'
import type { DownloaderKey } from './locales.ts'
import type { DownloadNamespace, SubmitResult } from './namespace.ts'

type Translate = (key: DownloaderKey) => string
type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; candidates: readonly Candidate[] }

/** Render a publication instant as a Japan-time calendar date. */
function formatPublished(publishedAt: string | null): string {
  if (publishedAt === null) return '—'
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(publishedAt))
  const value = (type: string): string => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}年${value('month')}月${value('day')}日`
}

/** Columns the list can be ordered by. */
type SortKey = 'published' | 'seeders' | 'leechers' | 'downloads'

/** Read one sortable value; missing values always sort last. */
function sortValue(candidate: Candidate, key: SortKey): number {
  if (key === 'published') return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt)
  return candidate[key] ?? -1
}

/** Order candidates by the selected column. */
function order(candidates: readonly Candidate[], sort: { key: SortKey; descending: boolean }): readonly Candidate[] {
  const direction = sort.descending ? -1 : 1
  return [...candidates].sort((left, right) => direction * (sortValue(left, sort.key) - sortValue(right, sort.key)))
}

/** Translate every host submission outcome. */
function outcome(result: SubmitResult, t: Translate): string {
  if ('gid' in result) return t('submitted').replace('{gid}', result.gid)
  if ('alreadySubmitted' in result) return t('alreadySubmitted').replace('{gid}', result.alreadySubmitted)
  if ('alreadySubmitting' in result) return t('alreadySubmitting')
  return t('unsubmittable')
}

/** A candidate owns its pending state and visible submission outcome. */
function CandidateRow({ candidate, t, download }: { candidate: Candidate; t: Translate; download: DownloadNamespace }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const published = formatPublished(candidate.publishedAt)
  async function submit() {
    setPending(true)
    try {
      const result = await download.add(candidate.id)
      setMessage(result.ok ? outcome(result.value, t) : t('submitError'))
    } catch {
      setMessage(t('submitError'))
    } finally {
      setPending(false)
    }
  }
  const columns = '1fr 120px 70px 70px 70px'
  return (
    <li>
      <button
        type="button"
        disabled={!candidate.submittable || pending}
        onClick={() => { void submit() }}
        style={{
          display: 'grid', gridTemplateColumns: columns, gap: 8, width: '100%',
          textAlign: 'left', background: 'none', border: 'none', cursor: candidate.submittable ? 'pointer' : 'not-allowed',
          padding: '8px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', color: 'inherit',
        }}
      >
        <span>{candidate.title}</span>
        <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes)}</span>
        <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{published}</span>
        <span>{candidate.seeders ?? '—'}</span>
        <span>{candidate.downloads ?? '—'}</span>
      </button>
      {!candidate.submittable && <p>{t('unsubmittable')}</p>}
      {message !== '' && <p role="status">{message}</p>}
    </li>
  )
}

/** Render loading, empty, candidate and recoverable error states. */
export function DownloaderPanel({ t, download }: { t: Translate; download: DownloadNamespace }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'published', descending: true })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const load = useCallback(async (refresh: boolean) => {
    setState({ kind: 'loading' })
    try {
      if (refresh) {
        const result = await download.refresh()
        if (!result.ok) { setState({ kind: 'error' }); return }
      }
      const result = await download.list(page)
      setState(result.ok ? { kind: 'ready', candidates: result.value } : { kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }, [download])
  useEffect(() => { void load(false) }, [load])
  const runSearch = useCallback(async () => {
    setState({ kind: 'loading' })
    setPage(1)
    try {
      const result = await download.search(keyword, 1)
      setState(result.ok ? { kind: 'ready', candidates: result.value } : { kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }, [download, keyword])
  const visible = state.kind === 'ready' ? order(state.candidates, sort) : []
  return (
    <section style={{ padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }}>
      <h1>{t('panel')}</h1>
      <p style={{ color: 'var(--dsw-alias-label-secondary)' }}>{t('description')}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        <input
          aria-label={t('search')}
          value={keyword}
          placeholder={t('search')}
          onChange={event => { setKeyword(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Enter') void runSearch() }}
          style={{ padding: '6px 8px', minWidth: 220 }}
        />
        <button type="button" disabled={state.kind === 'loading'} onClick={() => { void runSearch() }}>{t('search')}</button>
        <button type="button" disabled={state.kind === 'loading'} onClick={() => { void load(true) }}>{t('refresh')}</button>
      </div>
      {state.kind === 'loading' && <p role="status">{t('loading')}</p>}
      {state.kind === 'error' && <div role="alert"><p>{t('error')}</p><button type="button" onClick={() => { void load(false) }}>{t('retry')}</button></div>}
      {state.kind === 'ready' && (state.candidates.length === 0 ? <p>{t('empty')}</p> : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px 70px', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
            <span>{t('title')}</span><span>{t('size')}</span><span>{t('published')}</span><span>{t('seeders')}</span><span>{t('downloads')}</span>
          </div>
          <div role="group" aria-label="sort" style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            {(['published', 'seeders', 'leechers', 'downloads'] as const).map(key => (
              <button
                key={key}
                type="button"
                aria-pressed={sort.key === key}
                onClick={() => { setSort(current => ({ key, descending: current.key === key ? !current.descending : true })) }}
              >{t(key)}{sort.key === key ? (sort.descending ? ' ↓' : ' ↑') : ''}</button>
            ))}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }}>
            {visible.map(candidate => <CandidateRow key={candidate.id} candidate={candidate} t={t} download={download} />)}
          </ul>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="button" disabled={page <= 1} onClick={() => { setPage(value => Math.max(1, value - 1)) }}>‹</button>
            <span aria-live="polite">{page}</span>
            <button type="button" onClick={() => { setPage(value => value + 1) }}>›</button>
          </div>
        </div>
      ))}
    </section>
  )
}
