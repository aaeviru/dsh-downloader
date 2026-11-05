export function normalizeInfoHash(raw) {
    if (typeof raw !== 'string')
        return null;
    if (/^[a-f0-9]{40}$/i.test(raw))
        return raw.toLowerCase();
    if (!/^[a-z2-7]{32}$/i.test(raw))
        return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = raw.toUpperCase().split('').map(char => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
    let hex = '';
    for (let offset = 0; offset < bits.length; offset += 8) {
        hex += Number.parseInt(bits.slice(offset, offset + 8), 2).toString(16).padStart(2, '0');
    }
    return hex;
}
export function dedupeCandidates(list) {
    const seen = new Set();
    return list.filter((candidate) => {
        if (seen.has(candidate.dedupeKey))
            return false;
        seen.add(candidate.dedupeKey);
        return true;
    });
}
//# sourceMappingURL=candidate.js.map