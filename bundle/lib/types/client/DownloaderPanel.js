import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
/** Render a publication instant as a Japan-time calendar date. */
function formatPublished(publishedAt) {
    if (publishedAt === null)
        return '—';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date(publishedAt));
    const value = (type) => parts.find(part => part.type === type)?.value ?? '';
    return `${value('year')}年${value('month')}月${value('day')}日`;
}
/** Read one sortable value; missing values always sort last. */
function sortValue(candidate, key) {
    if (key === 'published')
        return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt);
    return candidate[key] ?? -1;
}
/** Order candidates by the selected column. */
function order(candidates, sort) {
    const direction = sort.descending ? -1 : 1;
    return [...candidates].sort((left, right) => direction * (sortValue(left, sort.key) - sortValue(right, sort.key)));
}
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
    const published = formatPublished(candidate.publishedAt);
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
    const columns = '1fr 120px 70px 70px 70px';
    return (_jsxs("li", { children: [_jsxs("button", { type: "button", disabled: !candidate.submittable || pending, onClick: () => { void submit(); }, style: {
                    display: 'grid', gridTemplateColumns: columns, gap: 8, width: '100%',
                    textAlign: 'left', background: 'none', border: 'none', cursor: candidate.submittable ? 'pointer' : 'not-allowed',
                    padding: '8px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', color: 'inherit',
                }, children: [_jsx("span", { children: candidate.title }), _jsx("span", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes) }), _jsx("span", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: published }), _jsx("span", { children: candidate.seeders ?? '—' }), _jsx("span", { children: candidate.downloads ?? '—' })] }), !candidate.submittable && _jsx("p", { children: t('unsubmittable') }), message !== '' && _jsx("p", { role: "status", children: message })] }));
}
/** Render loading, empty, candidate and recoverable error states. */
export function DownloaderPanel({ t, download }) {
    const [state, setState] = useState({ kind: 'loading' });
    const [sort, setSort] = useState({ key: 'published', descending: true });
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;
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
    const runSearch = useCallback(async () => {
        setState({ kind: 'loading' });
        setPage(1);
        try {
            const result = await download.search(keyword);
            setState(result.ok ? { kind: 'ready', candidates: result.value } : { kind: 'error' });
        }
        catch {
            setState({ kind: 'error' });
        }
    }, [download, keyword]);
    const ordered = state.kind === 'ready' ? order(state.candidates, sort) : [];
    const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
    const visible = ordered.slice((page - 1) * pageSize, page * pageSize);
    return (_jsxs("section", { style: { padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }, children: [_jsx("h1", { children: t('panel') }), _jsx("p", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: t('description') }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }, children: [_jsx("input", { "aria-label": t('search'), value: keyword, placeholder: t('search'), onChange: event => { setKeyword(event.target.value); }, onKeyDown: event => { if (event.key === 'Enter')
                            void runSearch(); }, style: { padding: '6px 8px', minWidth: 220 } }), _jsx("button", { type: "button", disabled: state.kind === 'loading', onClick: () => { void runSearch(); }, children: t('search') }), _jsx("button", { type: "button", disabled: state.kind === 'loading', onClick: () => { void load(true); }, children: t('refresh') })] }), state.kind === 'loading' && _jsx("p", { role: "status", children: t('loading') }), state.kind === 'error' && _jsxs("div", { role: "alert", children: [_jsx("p", { children: t('error') }), _jsx("button", { type: "button", onClick: () => { void load(false); }, children: t('retry') })] }), state.kind === 'ready' && (state.candidates.length === 0 ? _jsx("p", { children: t('empty') }) : (_jsxs("div", { children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px 70px', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }, children: [_jsx("span", { children: t('title') }), _jsx("span", { children: t('size') }), _jsx("span", { children: t('published') }), _jsx("span", { children: t('seeders') }), _jsx("span", { children: t('downloads') })] }), _jsx("div", { role: "group", "aria-label": "sort", style: { display: 'flex', gap: 8, margin: '8px 0' }, children: ['published', 'seeders', 'leechers', 'downloads'].map(key => (_jsxs("button", { type: "button", "aria-pressed": sort.key === key, onClick: () => { setSort(current => ({ key, descending: current.key === key ? !current.descending : true })); }, children: [t(key), sort.key === key ? (sort.descending ? ' ↓' : ' ↑') : ''] }, key))) }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }, children: visible.map(candidate => _jsx(CandidateRow, { candidate: candidate, t: t, download: download }, candidate.id)) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }, children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => { setPage(value => Math.max(1, value - 1)); }, children: "\u2039" }), _jsxs("span", { "aria-live": "polite", children: [page, " / ", pageCount] }), _jsx("button", { type: "button", disabled: page >= pageCount, onClick: () => { setPage(value => Math.min(pageCount, value + 1)); }, children: "\u203A" })] })] })))] }));
}
//# sourceMappingURL=DownloaderPanel.js.map