import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
/** Render a publication instant as a Japan-time calendar date. */
function formatPublished(publishedAt) {
    if (publishedAt === null)
        return '—';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date(publishedAt));
    const value = (type) => parts.find(part => part.type === type).value;
    return `${value('year')}年${value('month')}月${value('day')}日`;
}
/** Read one sortable value; missing values always sort last. */
function sortValue(candidate, key) {
    if (key === 'title')
        return candidate.title;
    if (key === 'size')
        return candidate.sizeBytes ?? -1;
    if (key === 'published')
        return candidate.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(candidate.publishedAt);
    return candidate[key] ?? -1;
}
/** Order candidates by the selected column. */
function order(candidates, sort) {
    const direction = sort.descending ? -1 : 1;
    return [...candidates].sort((left, right) => {
        const a = sortValue(left, sort.key);
        const b = sortValue(right, sort.key);
        if (typeof a === 'string' || typeof b === 'string')
            return direction * String(a).localeCompare(String(b));
        return direction * (a - b);
    });
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
function CandidateRow({ candidate, t, download, gid, selected, select, refreshSubmissions }) {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    const published = formatPublished(candidate.publishedAt);
    async function submit(resubmit = false) {
        setPending(true);
        try {
            const result = await (resubmit ? download.resubmit(candidate.id) : download.add(candidate.id));
            setMessage(result.ok ? outcome(result.value, t) : t('submitError'));
            if (result.ok && ('gid' in result.value || 'alreadySubmitted' in result.value)) {
                await refreshSubmissions();
                setMessage('');
            }
        }
        catch {
            setMessage(t('submitError'));
        }
        finally {
            setPending(false);
        }
    }
    function activate() {
        if (pending)
            return;
        select();
        if (gid === undefined && candidate.submittable)
            void submit();
    }
    const columns = '1fr 120px 70px 70px 70px';
    return (_jsxs("li", { "data-submitted": gid !== undefined, style: { background: gid !== undefined ? 'var(--dsw-alias-state-success-tertiary)' : 'none' }, children: [_jsxs("div", { onClick: activate, style: {
                    display: 'grid', gridTemplateColumns: columns, gap: 8, width: '100%',
                    textAlign: 'left', cursor: candidate.submittable ? 'pointer' : 'not-allowed',
                    padding: '8px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', color: 'inherit',
                }, children: [_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("button", { type: "button", disabled: pending || (gid === undefined && !candidate.submittable), style: { background: 'none', border: 'none', padding: 0, color: 'inherit', textAlign: 'left', cursor: 'inherit' }, children: _jsx("span", { children: candidate.title }) }), selected && gid !== undefined && _jsx("button", { type: "button", "aria-label": t('resubmit'), disabled: pending || !candidate.submittable, onClick: event => { event.stopPropagation(); void submit(true); }, children: _jsx("span", { "aria-hidden": "true", children: "\u21BB" }) })] }), _jsx("span", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: candidate.sizeBytes === null ? t('unknownSize') : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'byte' }).format(candidate.sizeBytes) }), _jsx("span", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: published }), _jsx("span", { children: candidate.seeders ?? '—' }), _jsx("span", { children: candidate.downloads ?? '—' })] }), gid !== undefined && _jsx("p", { role: "status", children: t('submitted').replace('{gid}', gid) }), !candidate.submittable && _jsx("p", { children: t('unsubmittable') }), message !== '' && _jsx("p", { role: "status", children: message })] }));
}
/** Render loading, empty, candidate and recoverable error states. */
export function DownloaderPanel({ t, download }) {
    const [state, setState] = useState({ kind: 'loading' });
    const [sort, setSort] = useState({ key: 'published', descending: true });
    const [keyword, setKeyword] = useState('');
    const [preferences, setPreferences] = useState({ history: [], favorites: [] });
    const [preferencesError, setPreferencesError] = useState(false);
    const [preferencesPending, setPreferencesPending] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const preferenceArea = useRef(null);
    const preferenceButton = useRef(null);
    const changePreferences = useCallback(async (operation) => {
        setPreferencesPending(true);
        try {
            const result = await operation();
            if (!result.ok)
                throw result.error;
            setPreferences(result.value);
            setPreferencesError(false);
        }
        catch {
            setPreferencesError(true);
        }
        finally {
            setPreferencesPending(false);
        }
    }, []);
    useEffect(() => { void changePreferences(() => download.preferences()); }, [download, changePreferences]);
    useEffect(() => {
        if (!expanded)
            return;
        const outside = (event) => {
            if (event.target instanceof Node && !preferenceArea.current?.contains(event.target))
                setExpanded(false);
        };
        document.addEventListener('pointerdown', outside);
        return () => { document.removeEventListener('pointerdown', outside); };
    }, [expanded]);
    const lastExecutedKeyword = useRef(undefined);
    const [candidates, setCandidates] = useState([]);
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState();
    const [submittedGids, setSubmittedGids] = useState(new Map());
    const submittedKeys = new Set(submittedGids.keys());
    const refreshSubmissions = useCallback(async () => {
        const result = await download.submissions();
        if (!result.ok)
            throw result.error;
        setSubmittedGids(new Map(result.value.map(record => [record.key, record.gid])));
    }, [download]);
    const pageSize = 20;
    const load = useCallback(async (refresh) => {
        setState({ kind: 'loading' });
        try {
            await refreshSubmissions();
            if (refresh && lastExecutedKeyword.current === undefined) {
                const result = await download.refresh();
                if (!result.ok) {
                    setState({ kind: 'error' });
                    return;
                }
                setCandidates(result.value.candidates);
                setState({ kind: 'ready' });
            }
            else {
                const result = refresh
                    ? await download.search(lastExecutedKeyword.current)
                    : await download.list();
                if (result.ok) {
                    setCandidates(result.value);
                    setState({ kind: 'ready' });
                }
                else {
                    setState({ kind: 'error' });
                }
            }
            setPage(1);
        }
        catch {
            setState({ kind: 'error' });
        }
    }, [download, refreshSubmissions]);
    useEffect(() => { void load(false); }, [load]);
    const runSearch = useCallback(async () => {
        const executed = keyword.trim();
        if (!executed || state.kind === 'loading')
            return;
        setState({ kind: 'loading' });
        setPage(1);
        lastExecutedKeyword.current = executed;
        try {
            await refreshSubmissions();
            const result = await download.search(executed);
            if (result.ok) {
                setCandidates(result.value);
                await changePreferences(() => download.recordSearch(executed));
            }
            setState(result.ok ? { kind: 'ready' } : { kind: 'error' });
        }
        catch {
            setState({ kind: 'error' });
        }
    }, [download, keyword, refreshSubmissions, changePreferences, state.kind]);
    const ordered = order(candidates, sort);
    const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
    const visible = ordered.slice((page - 1) * pageSize, page * pageSize);
    return (_jsxs("section", { style: { padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }, children: [_jsx("h1", { children: t('panel') }), _jsx("p", { style: { color: 'var(--dsw-alias-label-secondary)' }, children: t('description') }), _jsxs("div", { ref: preferenceArea, onKeyDown: event => {
                    if (event.key === 'Escape') {
                        setExpanded(false);
                        preferenceButton.current?.focus();
                    }
                }, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '12px 0' }, children: [_jsx("input", { "aria-label": t('search'), value: keyword, placeholder: t('search'), onChange: event => { setKeyword(event.target.value); }, onKeyDown: event => { if (event.key === 'Enter')
                                    void runSearch(); }, style: { padding: '6px 8px', minWidth: 220 } }), _jsx("button", { type: "button", disabled: state.kind === 'loading', onClick: () => { void runSearch(); }, children: t('search') }), _jsx("button", { type: "button", disabled: state.kind === 'loading', onClick: () => { void load(true); }, children: t('refresh') }), _jsx("button", { ref: preferenceButton, type: "button", "aria-expanded": expanded, onClick: () => { setExpanded(value => !value); }, children: t('savedSearches') }), _jsx("button", { type: "button", disabled: !keyword.trim() || preferencesPending, "aria-pressed": preferences.favorites.includes(keyword.trim()), onClick: () => { void changePreferences(() => download.toggleFavorite(keyword.trim())); }, children: t(preferences.favorites.includes(keyword.trim()) ? 'unfavorite' : 'favorite') })] }), expanded && _jsxs("div", { style: { padding: 12, border: '1px solid var(--dsw-alias-border-l2)', maxHeight: 300, overflowY: 'auto' }, children: [['favorites', 'history'].map(group => _jsxs("section", { "aria-label": t(group === 'history' ? 'recent' : 'favorites'), children: [_jsx("h2", { style: { fontSize: 'inherit', fontWeight: 500 }, children: t(group === 'history' ? 'recent' : 'favorites') }), preferences[group].map(item => _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [_jsx("button", { type: "button", style: { overflowWrap: 'anywhere' }, onClick: () => { setKeyword(item); setExpanded(false); }, children: item }), _jsx("button", { type: "button", disabled: preferencesPending, "aria-label": `${t(preferences.favorites.includes(item) ? 'unfavorite' : 'favorite')} ${item}`, onClick: () => { void changePreferences(() => download.toggleFavorite(item)); }, children: t(preferences.favorites.includes(item) ? 'unfavorite' : 'favorite') }), group === 'history' && _jsx("button", { type: "button", disabled: preferencesPending, "aria-label": `${t('deleteSearch')} ${item}`, onClick: () => { void changePreferences(() => download.deleteSearch(item)); }, children: t('deleteSearch') })] }, item))] }, group)), preferences.history.length === 0 && preferences.favorites.length === 0 && _jsx("p", { children: t('noSavedSearches') }), _jsx("button", { type: "button", disabled: preferencesPending || preferences.history.length === 0, onClick: () => { void changePreferences(() => download.clearHistory()); }, children: t('clearHistory') })] })] }), preferencesError && _jsxs("div", { role: "alert", children: [t('preferencesError'), " ", _jsx("button", { type: "button", disabled: preferencesPending, onClick: () => { void changePreferences(() => download.preferences()); }, children: t('retry') })] }), state.kind === 'loading' && _jsx("p", { role: "status", children: t('loading') }), state.kind === 'error' && _jsxs("div", { role: "alert", children: [_jsx("p", { children: t('error') }), _jsx("button", { type: "button", onClick: () => { void load(true); }, children: t('retry') })] }), (state.kind === 'ready' || candidates.length > 0) && (candidates.length === 0 ? _jsx("p", { children: t('empty') }) : (_jsxs("div", { children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px 70px', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--dsw-alias-border-l2)', fontSize: 12 }, children: ['title', 'size', 'published', 'seeders', 'downloads'].map(key => (_jsxs("button", { type: "button", "aria-pressed": sort.key === key, onClick: () => { setSort(current => ({ key, descending: current.key === key ? !current.descending : true })); }, style: { background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: sort.key === key ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)', fontSize: 12 }, children: [t(key), sort.key === key ? (sort.descending ? ' ↓' : ' ↑') : ''] }, key))) }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0, maxHeight: 420, overflowY: 'auto' }, children: visible.map(candidate => _jsx(CandidateRow, { candidate: candidate, t: t, download: download, gid: submittedKeys.has(candidate.dedupeKey) ? submittedGids.get(candidate.dedupeKey) : undefined, selected: selectedId === candidate.id, select: () => { setSelectedId(candidate.id); }, refreshSubmissions: refreshSubmissions }, candidate.id)) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }, children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => { setPage(value => Math.max(1, value - 1)); }, children: "\u2039" }), _jsxs("span", { "aria-live": "polite", children: [page, " / ", pageCount] }), _jsx("button", { type: "button", disabled: page >= pageCount, onClick: () => { setPage(value => Math.min(pageCount, value + 1)); }, children: "\u203A" })] })] })))] }));
}
//# sourceMappingURL=DownloaderPanel.js.map