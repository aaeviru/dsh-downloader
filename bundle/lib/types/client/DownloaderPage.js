/** Localized downloader page over the host Remote namespace. */
import { useEffect, useState } from 'react';
const formatSize = (bytes) => bytes === null
    ? '—'
    : `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
/**
 * Render the candidate list with loading, empty, error, and submitted states.
 * @param props - localized copy plus the host actions.
 * @returns The downloader page.
 */
export function DownloaderPage({ copy, actions }) {
    const [rows, setRows] = useState(null);
    const [failure, setFailure] = useState(null);
    const [submitted, setSubmitted] = useState(null);
    const load = () => {
        setFailure(null);
        void actions.list().then(setRows, (error) => { setFailure(error.message); });
    };
    useEffect(load, []);
    return (<section style={{ padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 500 }}>{copy.title}</h1>
      <p style={{ color: 'var(--dsw-alias-label-secondary)' }}>{copy.description}</p>
      <button type="button" onClick={load} style={{ marginBottom: 16 }}>{copy.refresh}</button>
      {failure !== null && <p role="alert">{copy.error} {failure}</p>}
      {rows === null && failure === null && <p>{copy.loading}</p>}
      {rows !== null && rows.length === 0 && <p>{copy.empty}</p>}
      {rows !== null && rows.length > 0 && (<ul style={{ listStyle: 'none', padding: 0 }}>
          {rows.map(row => (<li key={row.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' }}>
              <span style={{ flex: 1 }}>{row.title}</span>
              <span style={{ color: 'var(--dsw-alias-label-secondary)' }}>{formatSize(row.sizeBytes)}</span>
              <button type="button" disabled={!row.submittable} onClick={() => {
                    void actions.add(row.id).then(async (result) => { setSubmitted({ gid: result.gid, status: await actions.status(result.gid) }); }, (error) => { setFailure(error.message); });
                }}>{copy.submit}</button>
            </li>))}
        </ul>)}
      {submitted !== null && <p aria-live="polite">{copy.submitted} {submitted.gid} · {copy.status} {submitted.status}</p>}
    </section>);
}
//# sourceMappingURL=DownloaderPage.js.map