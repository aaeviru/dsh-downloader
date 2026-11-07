import { mkdtemp, readFile, readdir, rm, stat, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { createJsonFilePreferencesBackend, openPreferencesStore } from '../src/preferences.ts'

export const memoryPreferences = () => openPreferencesStore({ load: async () => ({ history: [], favorites: [] }), save: async () => {} })

it('C2/C3 trims only ends, deduplicates to front, caps at 50 and ignores blanks', async () => {
  const store = await memoryPreferences()
  await store.addSearch('  A  "B" OR c  ')
  await store.addSearch('a  "B" OR c')
  await store.addSearch('A  "B" OR c')
  expect(store.value.history).toEqual(['A  "B" OR c', 'a  "B" OR c'])
  await store.addSearch('  ')
  expect(store.value.history).toHaveLength(2)
  for (let i = 0; i < 51; i++) await store.addSearch(String(i))
  expect(store.value.history).toEqual(Array.from({ length: 50 }, (_, i) => String(50 - i)))
})

it('C5/C6 favorites are unique newest-first; delete and clear preserve favorites', async () => {
  const store = await memoryPreferences()
  await store.toggleFavorite(' ')
  await store.toggleFavorite(' A ')
  await store.toggleFavorite('B')
  expect(store.value.favorites).toEqual(['B', 'A'])
  await store.toggleFavorite('A')
  expect(store.value.favorites).toEqual(['B'])
  await store.addSearch('A'); await store.addSearch('B')
  await store.deleteSearch(' A ')
  expect(store.value.history).toEqual(['B'])
  await store.clearHistory()
  expect(store.value).toEqual({ history: [], favorites: ['B'] })
  await store.flush()
})

it('serializes writes, surfaces failure without publishing, and permits a later retry', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
  const store = await openPreferencesStore({ load: async () => ({ history: [], favorites: [] }), save })
  await expect(store.addSearch('lost')).rejects.toThrow('disk full')
  await expect(store.flush()).rejects.toThrow('disk full')
  expect(store.value.history).toEqual([])
  await Promise.all([store.addSearch('first'), store.addSearch('second')])
  expect(store.value.history).toEqual(['second', 'first'])
})

it('load failure never writes an empty replacement', async () => {
  const save = vi.fn()
  await expect(openPreferencesStore({ load: async () => { throw new Error('invalid') }, save })).rejects.toThrow('invalid')
  expect(save).not.toHaveBeenCalled()
})

it('roundtrips atomic JSON with owner-only permissions and no temporary residue', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'preferences-'))
  try {
    const path = join(dir, 'preferences.json')
    const backend = createJsonFilePreferencesBackend(path)
    expect(await backend.load()).toEqual({ history: [], favorites: [] })
    await backend.save({ history: ['a'], favorites: ['b'] })
    expect(await backend.load()).toEqual({ history: ['a'], favorites: ['b'] })
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    expect(await readdir(dir)).toEqual(['preferences.json'])
    for (const invalid of ['{', 'null', '[]', '{}', '{"history":[]}', '{"history":[1],"favorites":[]}', '{"history":[" "],"favorites":[]}', '{"history":["a","a"],"favorites":[]}', JSON.stringify({ history: Array.from({length: 51}, (_, i) => String(i)), favorites: [] })]) {
      await writeFile(path, invalid)
      await expect(backend.load()).rejects.toThrow()
      expect(await readFile(path, 'utf8')).toBe(invalid)
    }
    await rm(path); await mkdir(path)
    await expect(backend.load()).rejects.toThrow()
    await expect(backend.save({ history: [], favorites: [] })).rejects.toThrow()
    expect(await readdir(dir)).toEqual(['preferences.json'])
  } finally { await rm(dir, { recursive: true, force: true }) }
})
