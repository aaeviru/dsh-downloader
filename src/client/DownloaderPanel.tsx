import { useCallback, useEffect, useState } from 'react'
import type { Candidate } from '../types.ts'
import type { DownloaderKey } from './locales.ts'
import type { DownloadNamespace, SubmitResult } from './namespace.ts'

type Translate = (key: DownloaderKey) => string
type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; candidates: readonly Candidate[] }

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
  return (
    <li style={{ padding: '12px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)' }}>
      <span>{candidate.title}</span>{' '}
      <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes)}</span>{' '}
      <button type="button" disabled={!candidate.submittable || pending} onClick={() => { void submit() }}>{pending ? t('submitting') : t('submit')}</button>
      {!candidate.submittable && <p>{t('unsubmittable')}</p>}
      <p role="status">{message}</p>
    </li>
  )
}

/** Render loading, empty, candidate and recoverable error states. */
export function DownloaderPanel({ t, download }: { t: Translate; download: DownloadNamespace }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const load = useCallback(async (refresh: boolean) => {
    setState({ kind: 'loading' })
    try {
      if (refresh) {
        const result = await download.refresh()
        if (!result.ok) { setState({ kind: 'error' }); return }
      }
      const result = await download.list()
      setState(result.ok ? { kind: 'ready', candidates: result.value } : { kind: 'error' })
    } catch {
      setState({ kind: 'error' })
    }
  }, [download])
  useEffect(() => { void load(false) }, [load])
  return (
    <section style={{ padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }}>
      <h1>{t('panel')}</h1>
      <p style={{ color: 'var(--dsw-alias-label-secondary)' }}>{t('description')}</p>
      <button type="button" disabled={state.kind === 'loading'} onClick={() => { void load(true) }}>{t('refresh')}</button>
      {state.kind === 'loading' && <p role="status">{t('loading')}</p>}
      {state.kind === 'error' && <div role="alert"><p>{t('error')}</p><button type="button" onClick={() => { void load(false) }}>{t('retry')}</button></div>}
      {state.kind === 'ready' && (state.candidates.length === 0 ? <p>{t('empty')}</p> : <ul style={{ listStyle: 'none', padding: 0 }}>{state.candidates.map(candidate => <CandidateRow key={candidate.id} candidate={candidate} t={t} download={download} />)}</ul>)}
    </section>
  )
}
