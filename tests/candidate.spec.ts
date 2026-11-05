import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dedupeCandidates, normalizeInfoHash } from '../src/candidate.ts'
import { parseRssFeed } from '../src/rss.ts'

const fixture = () => readFileSync(join(import.meta.dirname, 'fixtures', 'minimal.xml'), 'utf8')

describe('normalizeInfoHash', () => {
  it('normalizes hex and exact 20-byte base32 hashes and rejects invalid inputs', () => {
    expect(parseRssFeed(fixture(), { sourceId: 'test' })).toHaveLength(1)
    expect(normalizeInfoHash('0123456789ABCDEF0123456789ABCDEF01234567')).toBe(
      '0123456789abcdef0123456789abcdef01234567',
    )
    expect(normalizeInfoHash('AERUKZ4JVPG66AJDIVTYTK6N54ASGRLH')).toBe('0123456789abcdef0123456789abcdef01234567')
    expect(normalizeInfoHash('a'.repeat(32))).toBe('0'.repeat(40))
    expect(normalizeInfoHash('7'.repeat(32))).toBe('f'.repeat(40))
    for (const input of [
      null, undefined, '', 'a'.repeat(31), 'a'.repeat(33), '0'.repeat(32),
      'g'.repeat(40), 'a'.repeat(39), 'a'.repeat(41), ' '.repeat(32), 'A'.repeat(31) + '=',
    ]) {
      expect(normalizeInfoHash(input)).toBeNull()
    }
  })
})

describe('dedupeCandidates', () => {
  it('keeps first occurrence order in a new array without changing inputs', () => {
    const original = parseRssFeed(fixture(), { sourceId: 'test' })
    const first = original[0]!
    const second = { ...first, id: 'second', dedupeKey: 'url:second' }
    const duplicate = { ...first, title: 'later' }
    const input = Object.freeze([Object.freeze(first), Object.freeze(second), Object.freeze(duplicate)])
    const result = dedupeCandidates(input)
    expect(result).toEqual([first, second])
    expect(result[0]).toBe(first)
    expect(result).not.toBe(input)
    expect(input).toEqual([first, second, duplicate])
    expect(dedupeCandidates([])).toEqual([])
  })
})
