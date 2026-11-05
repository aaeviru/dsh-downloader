import { describe, expect, it } from 'vitest'
import { selectForSubmission } from '../src/rules.ts'
import type { Candidate } from '../src/candidate.ts'

function candidate(title: string): Candidate {
  return {
    id: title, sourceId: 'source', title, publishedAt: null, infoHash: null,
    magnetUri: null, torrentUrl: null, sizeBytes: null, sourceUrl: '',
    submittable: true, dedupeKey: title,
  }
}

const candidates = Object.freeze([
  Object.freeze(candidate('Alpha episode')),
  Object.freeze(candidate('unmatched')),
  Object.freeze(candidate('BETA episode')),
  Object.freeze(candidate('alpha sequel')),
])
const config = { keywords: ['ALPHA', 'beta'], maxPerRound: 10, autoSubmit: true }

describe('selectForSubmission', () => {
  it('matches any keyword case-insensitively in input order without mutation', () => {
    const before = [...candidates]
    expect(selectForSubmission(candidates, config)).toEqual([candidates[0], candidates[2], candidates[3]])
    expect(candidates).toEqual(before)
  })

  it('caps submissions at maxPerRound', () => {
    expect(selectForSubmission(candidates, { ...config, maxPerRound: 1 })).toEqual([candidates[0]])
  })

  it.each([0, -1])('returns no submissions for cap %s', (maxPerRound) => {
    expect(selectForSubmission(candidates, { ...config, maxPerRound })).toEqual([])
  })

  it('requires explicit autoSubmit', () => {
    expect(selectForSubmission(candidates, { ...config, autoSubmit: false })).toEqual([])
  })

  it('returns no submissions for empty input or no matching keywords', () => {
    expect(selectForSubmission([], config)).toEqual([])
    expect(selectForSubmission(candidates, { ...config, keywords: [] })).toEqual([])
    expect(selectForSubmission(candidates, { ...config, keywords: ['missing'] })).toEqual([])
  })
})
