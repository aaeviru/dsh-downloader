export interface Candidate {
  readonly id: string
  readonly sourceId: string
  readonly title: string
  readonly publishedAt: string | null
  readonly infoHash: string | null
  readonly magnetUri: string | null
  readonly torrentUrl: string | null
  readonly sizeBytes: number | null
  readonly sourceUrl: string
  readonly submittable: boolean
  readonly dedupeKey: string
}

export function normalizeInfoHash(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  if (/^[a-f0-9]{40}$/i.test(raw)) return raw.toLowerCase()
  if (!/^[a-z2-7]{32}$/i.test(raw)) return null
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = raw.toUpperCase().split('').map(char => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('')
  let hex = ''
  for (let offset = 0; offset < bits.length; offset += 8) {
    hex += Number.parseInt(bits.slice(offset, offset + 8), 2).toString(16).padStart(2, '0')
  }
  return hex
}

export function dedupeCandidates(list: readonly Candidate[]): readonly Candidate[] {
  const seen = new Set<string>()
  return list.filter((candidate) => {
    if (seen.has(candidate.dedupeKey)) return false
    seen.add(candidate.dedupeKey)
    return true
  })
}
