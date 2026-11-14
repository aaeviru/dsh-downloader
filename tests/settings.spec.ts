import { expect, it } from 'vitest'
import { sourceKind, categoriesFor, resolveSettings, buildFeedUrl, isValidEndpoint, classifyConnectionFailure } from '../src/settings.ts'
import { SUKEBEI_CATEGORIES, SUKEBEI_CODES, CATEGORY_CODES } from '../src/catalog.ts'
import { Aria2Error, Aria2AuthError, Aria2TimeoutError, Aria2ProtocolError } from '../src/aria2.ts'

it('recognizes supported hosts and exposes only supported categories', () => {
  expect(sourceKind('https://sukebei.nyaa.si/?q=a')).toBe('sukebei')
  expect(sourceKind('https://nyaa.si/')).toBe('nyaa')
  expect(sourceKind('https://other.test/')).toBe('unknown')
  expect(sourceKind('invalid')).toBe('unknown')
  expect(categoriesFor('sukebei')).toEqual(SUKEBEI_CODES.map(code => ({ code, label: `category.${code}` })))
  expect(categoriesFor('sukebei')).toBe(SUKEBEI_CATEGORIES)
  expect(CATEGORY_CODES).toBe(SUKEBEI_CODES)
  expect(categoriesFor('nyaa')).toEqual([])
  expect(categoriesFor('unknown')).toEqual([])
})

it('resolves valid explicit filters before legacy parameters and defaults', () => {
  const input = { endpoint: 'http://host/jsonrpc', feedUrl: 'https://sukebei.nyaa.si/?f=1&c=2_1' }
  expect(resolveSettings({ ...input, qualityFilter: '0', category: '1_2' })).toEqual({ endpoint: input.endpoint, qualityFilter: '0', category: '1_2' })
  expect(resolveSettings(input)).toEqual({ endpoint: input.endpoint, qualityFilter: '1', category: '2_1' })
  expect(resolveSettings({ ...input, qualityFilter: 'invalid', category: 'invalid' })).toEqual(resolveSettings(input))
  for (const feedUrl of ['invalid', 'https://nyaa.si/', 'https://nyaa.si/?f=3&c=9_9']) {
    expect(resolveSettings({ ...input, feedUrl })).toEqual({ endpoint: input.endpoint, qualityFilter: '2', category: '0_0' })
  }
})

it('builds single encoded q/f/c parameters and preserves unrelated parameters', () => {
  const settings = { endpoint: 'http://host/', qualityFilter: '1', category: '2_1' } as const
  const feed = 'https://sukebei.nyaa.si/?page=rss&q=old&q=duplicate&f=0&f=2&c=0_0&c=1_0'
  const url = new URL(buildFeedUrl(feed, 'sukebei', settings, '日本 & a+b'))
  expect(url.searchParams.getAll('q')).toEqual(['日本 & a+b'])
  expect(url.searchParams.getAll('f')).toEqual(['1'])
  expect(url.searchParams.getAll('c')).toEqual(['2_1'])
  expect(url.searchParams.get('page')).toBe('rss')
  for (const keyword of [undefined, '', '  ']) {
    expect(new URL(buildFeedUrl(feed, 'sukebei', settings, keyword)).searchParams.getAll('q')).toEqual(['old'])
  }
  const nyaa = new URL(buildFeedUrl(feed, 'nyaa', settings))
  expect(nyaa.searchParams.getAll('f')).toEqual(['1'])
  expect(nyaa.searchParams.has('c')).toBe(false)
  const unknown = new URL(buildFeedUrl(feed, 'unknown', settings))
  expect(unknown.searchParams.has('f')).toBe(false)
  expect(unknown.searchParams.has('c')).toBe(false)
  expect(new URL(buildFeedUrl('https://host/', 'unknown', settings)).searchParams.has('q')).toBe(false)
})

it('validates endpoints with the same HTTP(S) and userinfo restrictions as Config', () => {
  for (const value of ['http://host', 'https://host:6800/jsonrpc', 'http://[::1]/jsonrpc']) expect(isValidEndpoint(value)).toBe(true)
  for (const value of ['', 'ftp://host/', 'http://user:pass@host/', 'http://host space/', 'https://host?x=1', 'invalid']) expect(isValidEndpoint(value)).toBe(false)
})

it('classifies aria2 errors without leaking their diagnostics', () => {
  expect(classifyConnectionFailure(new Aria2AuthError('secret'))).toBe('auth')
  expect(classifyConnectionFailure(new Aria2TimeoutError('secret'))).toBe('timeout')
  expect(classifyConnectionFailure(new Aria2ProtocolError('secret', 0, 'secret'))).toBe('protocol')
  expect(classifyConnectionFailure(new Aria2Error('secret'))).toBe('unreachable')
  expect(classifyConnectionFailure(null)).toBe('unreachable')
})
