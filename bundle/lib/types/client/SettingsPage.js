import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { QUALITY_FILTERS } from "../catalog.js";
/** Prefer accepted fields, falling back to the resolved legacy feed settings. */
function readDraft(value, info) {
    const field = (key) => typeof value?.[key] === 'string' ? value[key] : info.effective[key];
    return { endpoint: field('endpoint'), qualityFilter: field('qualityFilter'), category: field('category') };
}
/** Configuration contributed only to the downloader's row on the Plugins page. */
export function SettingsPage({ view, form, t, download }) {
    const id = useId();
    const [info, setInfo] = useState();
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState({ endpoint: '', qualityFilter: '0', category: '0_0' });
    const touched = useRef(new Set());
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState();
    const [testMessage, setTestMessage] = useState();
    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const result = await download.settingsInfo();
            if (!result.ok)
                throw result.error;
            setInfo(result.value);
        }
        catch {
            setLoadError(true);
        }
        finally {
            setLoading(false);
        }
    }, [download]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (info && touched.current.size === 0)
            setDraft(readDraft(form?.state.value, info));
    }, [form?.state.value, info]);
    const valid = /^https?:\/\/[^@/?#\s]+(?:\/[^\s]*)?$/.test(draft.endpoint);
    const editable = form?.state.status === 'ready' && form.state.writable;
    function change(field, value) {
        touched.current.add(field);
        setDraft(previous => ({ ...previous, [field]: value }));
        setMessage(undefined);
        setTestMessage(undefined);
    }
    async function save() {
        if (!form || !editable || saving || !valid || touched.current.size === 0)
            return;
        const ops = [...touched.current].map(field => ({ op: 'set', path: [field], value: draft[field] }));
        setSaving(true);
        try {
            if (await form.mutate(ops, form.state.revision)) {
                touched.current.clear();
                setMessage({ text: t('saved'), error: false });
                await load();
            }
            else
                setMessage({ text: t('saveFailed'), error: true });
        }
        catch {
            setMessage({ text: t('saveFailed'), error: true });
        }
        finally {
            setSaving(false);
        }
    }
    async function test() {
        if (testing || !valid)
            return;
        setTesting(true);
        setTestMessage(undefined);
        try {
            const result = await download.testConnection(draft.endpoint);
            if (!result.ok)
                throw result.error;
            const value = result.value;
            const reasons = { invalid: 'invalidEndpoint', auth: 'testAuth', timeout: 'testTimeout', unreachable: 'testUnreachable', protocol: 'testProtocol' };
            setTestMessage({ text: value.ok ? t('testSucceeded').replace('{version}', value.version) : t(reasons[value.reason]), error: !value.ok });
        }
        catch {
            setTestMessage({ text: t('testUnreachable'), error: true });
        }
        finally {
            setTesting(false);
        }
    }
    if (view === 'summary') {
        if (!info || loading || loadError)
            return null;
        const current = readDraft(form?.state.value, info);
        let host = current.endpoint;
        try {
            host = new URL(current.endpoint).host;
        }
        catch { /* Show the supplied endpoint if malformed. */ }
        const category = info.source.categories.find(option => option.code === current.category);
        return _jsxs("span", { children: [host, " \u00B7 ", t(`filter${current.qualityFilter}`), " \u00B7 ", category ? t(category.label) : current.category] });
    }
    if (!form || form.state.status === 'unavailable')
        return _jsx("p", { role: "status", children: t('settingsUnavailable') });
    if (form.state.status === 'loading' || (!info && loading))
        return _jsx("p", { role: "status", children: t('settingsLoading') });
    if (!info || loadError)
        return _jsxs("div", { role: "alert", children: [t('settingsUnavailable'), " ", _jsx("button", { type: "button", disabled: loading, onClick: () => { void load(); }, children: t('retry') })] });
    return _jsxs("section", { style: { padding: 24, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' }, children: [_jsx("h2", { children: t('settings') }), !form.state.writable && _jsx("p", { role: "status", children: t('settingsReadOnly') }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("label", { htmlFor: `${id}-filter`, children: t('uploadFilter') }), _jsx("select", { id: `${id}-filter`, value: draft.qualityFilter, disabled: !editable || saving || info.source.kind !== 'sukebei', onChange: event => { change('qualityFilter', event.target.value); }, children: QUALITY_FILTERS.map(filter => _jsx("option", { value: filter, children: t(`filter${filter}`) }, filter)) }), _jsx("label", { htmlFor: `${id}-category`, children: t('category') }), _jsx("select", { id: `${id}-category`, value: draft.category, disabled: !editable || saving || info.source.kind !== 'sukebei', onChange: event => { change('category', event.target.value); }, children: info.source.categories.map(option => _jsx("option", { value: option.code, children: t(option.label) }, option.code)) }), info.source.kind !== 'sukebei' && _jsx("p", { role: "status", children: t('sourceUnsupported') }), _jsx("label", { htmlFor: `${id}-endpoint`, children: t('endpoint') }), _jsx("input", { id: `${id}-endpoint`, type: "text", value: draft.endpoint, disabled: !editable || saving || testing, "aria-invalid": !valid, "aria-describedby": `${id}-hint${valid ? '' : ` ${id}-invalid`}`, onChange: event => { change('endpoint', event.target.value); } }), _jsx("p", { id: `${id}-hint`, style: { color: 'var(--dsw-alias-label-secondary)' }, children: t('endpointHelp') }), !valid && _jsx("p", { id: `${id}-invalid`, role: "alert", children: t('invalidEndpoint') })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { type: "button", disabled: testing || !valid, onClick: () => { void test(); }, children: t(testing ? 'testing' : 'testConnection') }), _jsx("button", { type: "button", disabled: !editable || saving || touched.current.size === 0 || !valid, onClick: () => { void save(); }, children: t(saving ? 'saving' : 'save') }), _jsx("button", { type: "button", disabled: saving || testing, onClick: () => {
                            touched.current.clear();
                            setDraft(readDraft(form.state.value, info));
                            setMessage(undefined);
                            setTestMessage(undefined);
                        }, children: t('cancel') })] }), message && _jsx("p", { role: message.error ? 'alert' : 'status', children: message.text }), testMessage && _jsx("p", { role: testMessage.error ? 'alert' : 'status', children: testMessage.text })] });
}
//# sourceMappingURL=SettingsPage.js.map