import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRssFeed, RssParseError } from '../src/rss.ts'

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')
const parse = (xml: string) => parseRssFeed(xml, { sourceId: 'test' })
const nyaa = () => parse(fixture('nyaa.xml'))
const variant = (content: string) => fixture('minimal.xml').replace(/<item>[\s\S]*?<\/item>/, content)

describe('parseRssFeed', () => {
  it('B1 magnet in link', () => {
    expect(nyaa()[0]).toMatchObject({
      infoHash: '0123456789abcdef0123456789abcdef01234567',
      magnetUri: 'magnet:?xt=urn:btih:0123456789ABCDEF0123456789ABCDEF01234567&dn=B1',
      submittable: true,
      publishedAt: '2026-11-05T10:33:37.000Z',
    })
  })
  it('B2 detail page with torrent enclosure', () => {
    expect(nyaa()[1]).toMatchObject({
      sourceUrl: 'https://sukebei.nyaa.si/view/9000002',
      torrentUrl: 'https://sukebei.nyaa.si/download/9000002.torrent',
      submittable: true,
      magnetUri: null,
    })
  })
  it('B3 info hash only must not fabricate a magnet', () => {
    expect(nyaa()[2]).toMatchObject({ infoHash: 'b'.repeat(40), magnetUri: null, torrentUrl: null, submittable: false })
  })
  it('B4 missing link and guid dropped', () => {
    const result = nyaa()
    expect(result).toHaveLength(5)
    expect(result.some(item => item.title.startsWith('B4'))).toBe(false)
  })
  it('B5 dedupe by same infoHash', () => {
    const result = parse(fixture('dupes.xml'))
    expect(result).toHaveLength(2)
    expect(result.filter(item => item.infoHash === 'f'.repeat(40))).toHaveLength(1)
    expect(result[0]?.title).toBe('B5 duplicate hash, first occurrence')
  })
  it('B6 dedupe by same sourceUrl', () => {
    const result = parse(fixture('dupes.xml'))
    expect(result).toHaveLength(2)
    expect(result[1]).toMatchObject({
      title: 'B6 no hash, shared source url, first occurrence',
      dedupeKey: 'url:https://sukebei.nyaa.si/view/9000103',
    })
  })
  it('B7 malformed XML becomes not-xml', () => {
    const xml = fixture('malformed.xml')
    expect(() => parse(xml)).toThrow(RssParseError)
    expect(() => parse(xml)).toThrow(expect.objectContaining({
      name: 'RssParseError',
      code: 'not-xml',
    }))
    let error: unknown
    try {
      parse(xml)
    } catch (cause) {
      error = cause
    }
    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty('cause', expect.anything())
    expect(() => parse('<rss><channel></rss>')).toThrow(RssParseError)
    expect(new RssParseError('not-xml')).toBeInstanceOf(Error)
  })
  it('B8 empty channel returns an empty array', () => {
    expect(parse(fixture('empty.xml'))).toEqual([])
    expect(parse('<rss><channel/></rss>')).toEqual([])
    expect(parse('<feed/>')).toEqual([])
  })
  it('B9 bad pubDate becomes null', () => {
    expect(nyaa()[4]?.publishedAt).toBeNull()
  })
  it('B10 bad nyaa:size becomes null', () => {
    expect(nyaa()[4]?.sizeBytes).toBeNull()
  })
  it('B11 torrent link without enclosure', () => {
    expect(nyaa()[3]).toMatchObject({
      torrentUrl: 'https://sukebei.nyaa.si/download/9000005.torrent',
      submittable: true,
      magnetUri: null,
    })
  })
  it('B12 RSS 1.0 RDF top-level items', () => {
    const result = parse(fixture('rdf.xml'))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      title: 'RDF item with torrent link',
      infoHash: '1'.repeat(40),
      torrentUrl: 'https://sukebei.nyaa.si/download/9000201.torrent',
    })
  })
  it('B13 Atom entries and alternate and enclosure links', () => {
    const result = parse(fixture('atom.xml'))
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      sourceUrl: 'https://sukebei.nyaa.si/view/9000301',
      torrentUrl: 'https://sukebei.nyaa.si/download/9000301.torrent',
      publishedAt: '2026-11-05T10:33:37.000Z',
    })
    expect(result[1]).toMatchObject({
      magnetUri: 'magnet:?xt=urn:btih:2222222222222222222222222222222222222222',
      infoHash: '2'.repeat(40),
      publishedAt: '2026-11-04T09:00:00.000Z',
    })
  })
  it('B14 real nyaa feed', () => {
    const result = parse(fixture('nyaa-real.xml'))
    expect(result).toHaveLength(6)
    for (const item of result) {
      expect(item.submittable).toBe(true)
      expect(item.infoHash).toMatch(/^[0-9a-f]{40}$/)
      expect(item.sizeBytes).not.toBeNull()
      expect(item.sourceUrl).toBe(item.torrentUrl)
    }
    expect(result.map(item => item.sizeBytes)).toEqual([
      1825361101, 1012819558, 676541235, 2576980378, 3113851290, 3758096384,
    ])
    expect(result[4]?.title).toContain('完全素人&レビュー')
    expect(result[4]?.title).not.toContain('&amp;')
  })
  it('B15 valid XML without channel becomes no-channel', () => {
    expect(() => parse(fixture('no-channel.xml'))).toThrow(expect.objectContaining({
      name: 'RssParseError',
      code: 'no-channel',
    }))
    expect(() => parse('<other/>')).toThrow(RssParseError)
  })
  it('B16 Atom id without a link remains non-submittable', () => {
    const result = parse('<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:example:entry</id></entry></feed>')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ sourceUrl: 'urn:example:entry', submittable: false })
  })
  it('maps the complete minimal candidate', () => {
    expect(parse(fixture('minimal.xml'))).toEqual([{
      id: 'test:url:https://sukebei.nyaa.si/view/1',
      sourceId: 'test',
      title: 'Only title and link',
      publishedAt: null,
      infoHash: null,
      magnetUri: null,
      torrentUrl: null,
      sizeBytes: null, seeders: null, leechers: null, downloads: null,
      sourceUrl: 'https://sukebei.nyaa.si/view/1',
      submittable: false,
      dedupeKey: 'url:https://sukebei.nyaa.si/view/1',
    }])
  })
  it('validates nested text, repeated fields, guid fallback and torrent namespace hashes', () => {
    const result = parse(variant(
      '<item><guid isPermaLink="true">https://example.test/1</guid>'
      + '<torrent:infoHash>7777777777777777777777777777777777777777</torrent:infoHash>'
      + '<title/><enclosure url="bad"/><enclosure url="https://example.test/a.torrent"/></item>'
      + '<item><link/><guid>fallback</guid><title><child>ignored</child></title></item>'
      + '<item><link>a</link><link>b</link></item>',
    ))
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      title: '',
      sourceUrl: 'https://example.test/1',
      infoHash: '7'.repeat(40),
      torrentUrl: 'https://example.test/a.torrent',
    })
    expect(result[1]).toMatchObject({ title: '', sourceUrl: 'fallback' })
  })
  it('extracts case-insensitive and encoded btih, skips invalid xt, and preserves magnets', () => {
    for (const query of [
      'xt=urn:BTIH:AERUKZ4JVPG66AJDIVTYTK6N54ASGRLH',
      'xt=urn:sha1:no&amp;xt=urn:btih:bad&amp;xt=urn%3Abtih%3A0123456789ABCDEF0123456789ABCDEF01234567',
    ]) {
      const result = parse(variant(`<item><link>magnet:?${query}</link></item>`))
      expect(result[0]?.infoHash).toBe('0123456789abcdef0123456789abcdef01234567')
      expect(result[0]?.magnetUri).toBe(`magnet:?${query.replaceAll('&amp;', '&')}`)
    }
    expect(parse(variant('<item><link>magnet:?dn=test</link></item>'))[0]).toMatchObject({
      infoHash: null,
      submittable: true,
    })
  })
  it('converts all binary size units and rejects missing, unknown and overflowing units', () => {
    for (const [value, expected] of [
      ['1B', 1],
      ['1.5kIb', 1536],
      ['0.5 MiB', 524288],
      ['1.7 GiB', 1825361101],
      ['1TiB', 1099511627776],
      ['1', null],
      ['1 KB', null],
      ['-1 B', null],
      [`${'9'.repeat(400)} B`, null],
    ] as const) {
      expect(parse(variant(`<item><link>url</link><nyaa:size>${value}</nyaa:size></item>`))[0]?.sizeBytes).toBe(
        expected,
      )
    }
  })
})
