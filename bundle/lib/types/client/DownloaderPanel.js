import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
/** Translate every host submission outcome. */
function outcome(result, t) {
    if ('gid' in result)
        return t('submitted').replace('{gid}', result.gid);
    if ('alreadySubmitted' in result)
        return t('alreadySubmitted').replace('{gid}', result.alreadySubmitted);
    if ('alreadySubmitting' in result)
        return t('alreadySubmitting');
    return t('unsubmittable');
}
/** A candidate owns its pending state and visible submission outcome. */
function CandidateRow({ candidate, t, download }) {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    async function submit() {
        setPending(true);
        try {
            const result = await download.add(candidate.id);
            setMessage(result.ok ? outcome(result.value, t) : t('submitError'));
        }
        catch {
            setMessage(t('submitError'));
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs("li", { style: { padding: '12px 0', borderBottom: '1px solid var(--dsw-alias-border-l2)' }, children: [_jsx("span", { children: candidate.title }), ' ', _jsx("span", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes) }), ' ', _jsx("button", { type: "button", disabled: !candidate.submittable || pending, onClick: () => { void submit(); }, children: pending ? t('submitting') : t('submit') }), !candidate.submittable && _jsx("p", { children: t('unsubmittable') }), _jsx("p", { role: "status", children: message })] }));
}
/** Render loading, empty, candidate and recoverable error states. */
export function DownloaderPanel({ t, download }) {
    const [state, setState] = useState({ kind: 'loading' });
    const load = useCallback(async (refresh) => {
        setState({ kind: 'loading' });
        try {
            if (refresh) {
                const result = await download.refresh();
                if (!result.ok) {
                    setState({ kind: 'error' });
                    return;
                }
            }
            const result = await download.list();
            setState(result.ok ? { kind: 'ready', candidates: result.value } : { kind: 'error' });
        }
        catch {
            setState({ kind: 'error' });
        }
    }, [download]);
    useEffect(() => { void load(false); }, [load]);
    return (_jsxs("section", { style: { padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }, children: [_jsx("h1", { children: t('panel') }), _jsx("p", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: t('description') }), _jsx("button", { type: "button", disabled: state.kind === 'loading', onClick: () => { void load(true); }, children: t('refresh') }), state.kind === 'loading' && _jsx("p", { role: "status", children: t('loading') }), state.kind === 'error' && _jsxs("div", { role: "alert", children: [_jsx("p", { children: t('error') }), _jsx("button", { type: "button", onClick: () => { void load(false); }, children: t('retry') })] }), state.kind === 'ready' && (state.candidates.length === 0 ? _jsx("p", { children: t('empty') }) : _jsx("ul", { style: { listStyle: 'none', padding: 0 }, children: state.candidates.map(candidate => _jsx(CandidateRow, { candidate: candidate, t: t, download: download }, candidate.id)) }))] }));
}
//# sourceMappingURL=DownloaderPanel.js.map