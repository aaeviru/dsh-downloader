import { useCallback, useEffect, useRef, useState } from 'react'
import type { Candidate } from '../types.ts'
import type { DownloaderKey } from './locales.ts'
import type { DownloadNamespace, SubmitResult } from './namespace.ts'

type Translate = (key: DownloaderKey) => string
type State = { kind: 'loading' | 'error' | 'ready' }

/** Render a publication instant as a Japan-time calendar date. */
function formatPublished(publishedAt: string | null): string {
  if (publishedAt === null) return '—'
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(publishedAt))
  const value = (type: string): string => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}年${value('month')}月${value('day')}日`
}

/** Columns the list can be ordered by. */
type SortKey = 'title' | 'size' | 'published' | 'seeders' | 'downloads'

/** Read one sortable value; missing values always sort last. */
function sortValue(candidate: Candidate, key: SortKey): number | string {
  if (key === 'title') return candidate.title
  if (key === 'size') return candidate.sizeBytes ?? -1
  if (key === 'published') return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt)
  return candidate[key] ?? -1
}

/** Order candidates by the selected column. */
function order(candidates: readonly Candidate[], sort: { key: SortKey; descending: boolean }): readonly Candidate[] {
  const direction = sort.descending ? -1 : 1
  return [...candidates].sort((left, right) => {
    const a = sortValue(left, sort.key)
    const b = sortValue(right, sort.key)
    if (typeof a === 'string' || typeof b === 'string') return direction * String(a).localeCompare(String(b))
    return direction * (a - b)
  })
}

/** Translate every host submission outcome. */
function outcome(result: SubmitResult, t: Translate): string {
  if ('gid' in result) return t('submitted').replace('{gid}', result.gid)
  if ('alreadySubmitted' in result) return t('alreadySubmitted').replace('{gid}', result.alreadySubmitted)
  if ('alreadySubmitting' in result) return t('alreadySubmitting')
  return t('unsubmittable')
}

/** A candidate owns its pending state and visible submission outcome. */
function CandidateRow({ candidate, t, download, gid, selected, select, refreshSubmissions }: {
  candidate: Candidate; t: Translate; download: DownloadNamespace; gid: string | undefined
  selected: boolean; select: () => void; refreshSubmissions: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const published = formatPublished(candidate.publishedAt)
  async function submit(resubmit = false) {
    setPending(true)
    try {
      const result = await (resubmit ? download.resubmit(candidate.id) : download.add(candidate.id))
      setMessage(result.ok ? outcome(result.value, t) : t('submitError'))
      if (result.ok && ('gid' in result.value || 'alreadySubmitted' in result.value)) {
        await refreshSubmissions()
        setMessage('')
      }
    } catch {
      setMessage(t('submitError'))
    } finally {
      setPending(false)
    }
  }
  function activate() {
    if (pending) return
    select()
    if (gid === undefined && candidate.submittable) void submit()
  }
  const columns = '1fr 120px 70px 70px 70px'
  return (
    <li data-submitted={gid !== undefined} style={{ background: gid !== undefined ? 'var(--dsw-alias-state-success-tertiary)' : 'none' }}>
      <div
        onClick={activate}
        style={{
          display: 'grid', gridTemplateColumns: columns, gap: 8, width: '100%',
          textAlign: 'left', cursor: candidate.submittable ? 'pointer' : 'not-allowed',
          padding: '8px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', color: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" disabled={pending || (gid === undefined && !candidate.submittable)}
            style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit' }}>
            <span>{candidate.title}</span>
          </button>
          {selected && gid !== undefined && <button type="button" aria-label={t('resubmit')}
            disabled={pending || !candidate.submittable}
            onClick={event => { event.stopPropagation(); void submit(true) }}>
            <span aria-hidden="true">↻</span>
          </button>}
        </span>
        <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes)}</span>
        <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{published}</span>
        <span>{candidate.seeders ?? '—'}</span>
        <span>{candidate.downloads ?? '—'}</span>
      </div>
      {gid !== undefined && <p role="status">{t('submitted').replace('{gid}', gid)}</p>}
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
  const lastExecutedKeyword = useRef<string | undefined>(undefined)
  const [candidates, setCandidates] = useState<readonly Candidate[]>([])
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string>()
  const [submittedGids, setSubmittedGids] = useState<ReadonlyMap<string, string>>(new Map())
  const submittedKeys = new Set(submittedGids.keys())
  const refreshSubmissions = useCallback(async () => {
    const result = await download.submissions()
    if (!result.ok) throw result.error
    setSubmittedGids(new Map(result.value.map(record => [record.key, record.gid])))
  }, [download])
  const pageSize = 20
  const load = useCallback(async (refresh: boolean) => {
    setState({ kind: 'loading' })
    try {
      await refreshSubmissions()
      if (refresh && lastExecutedKeyword.current === undefined) {
        const result = await download.refresh()
        if (!result.ok) { setState({ kind: 'error' }); return }
        setCandidates(result.value.candidates)
        setState({ kind: 'ready' })
      } else {
        const result = refresh
          ? await download.search(lastExecutedKeyword.current!)
          : await download.list()
        if (result.ok) setCandidates(result.value)
        setState(result.ok ? { kind: 'ready' } : { kind: 'error' })
      }
      setPage(1)
    } catch {
      setState({ kind: 'error' })
    }
  }, [download, refreshSubmissions])
  useEffect(() => { void load(false) }, [load])
  const runSearch = useCallback(async () => {
    setState({ kind: 'loading' })
    setPage(1)
    lastExecutedKeyword.current = keyword
    try {
      await refreshSubmissions()
      const result = await download.search(keyword)
      if (result.ok) setCandidates(result.value)
      setState(result.ok ? { kind: 'ready' } : { kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }, [download, keyword, refreshSubmissions])
  const ordered = order(candidates, sort)
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  const visible = ordered.slice((page - 1) * pageSize, page * pageSize)
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
      {state.kind === 'error' && <div role="alert"><p>{t('error')}</p><button type="button" onClick={() => { void load(true) }}>{t('retry')}</button></div>}
      {(state.kind === 'ready' || candidates.length > 0) && (candidates.length === 0 ? <p>{t('empty')}</p> : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px 70px', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', fontSize: 12 }}>
            {(['title', 'size', 'published', 'seeders', 'downloads'] as const).map(key => (
              <button
                key={key}
                type="button"
                aria-pressed={sort.key === key}
                onClick={() => { setSort(current => ({ key, descending: current.key === key ? !current.descending : true })) }}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: sort.key === key ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)', fontSize: 12 }}
              >{t(key)}{sort.key === key ? (sort.descending ? ' ↓' : ' ↑') : ''}</button>
            ))}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }}>
            {visible.map(candidate => <CandidateRow key={candidate.id} candidate={candidate} t={t} download={download}
              gid={submittedKeys.has(candidate.dedupeKey) ? submittedGids.get(candidate.dedupeKey) : undefined}
              selected={selectedId === candidate.id} select={() => { setSelectedId(candidate.id) }}
              refreshSubmissions={refreshSubmissions} />)}
          </ul>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="button" disabled={page <= 1} onClick={() => { setPage(value => Math.max(1, value - 1)) }}>‹</button>
            <span aria-live="polite">{page} / {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => { setPage(value => Math.min(pageCount, value + 1)) }}>›</button>
          </div>
        </div>
      ))}
    </section>
  )
}
