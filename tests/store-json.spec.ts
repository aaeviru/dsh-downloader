import { chmod, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createJsonFileSubmitStoreBackend } from '../src/store-json.ts'

let directory: string
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'downloader-')) })
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

it('loads missing files and atomically saves private records in a new directory', async () => {
  const path = join(directory, 'nested', 'submissions.json')
  const backend = createJsonFileSubmitStoreBackend(path)
  expect(await backend.load()).toEqual([])
  const records = [{ key: 'key', gid: 'gid' }]
  await backend.save(records)
  expect(await backend.load()).toEqual(records)
  await chmod(path, 0o644)
  await backend.save(records)
  expect(await readdir(join(directory, 'nested'))).toEqual(['submissions.json'])
  if (process.platform !== 'win32') expect((await stat(path)).mode & 0o777).toBe(0o600)
})

it.each(['{', '{}', '[null]', '[1]', '[{}]', '[{"key":"k"}]', '[{"key":1,"gid":"g"}]', '[{"key":"k","gid":1}]'])('rejects invalid document %s', async (contents) => {
  const path = join(directory, 'submissions.json')
  await writeFile(path, contents)
  await expect(createJsonFileSubmitStoreBackend(path).load()).rejects.toThrow('expected a JSON array')
})

it('propagates read failures and cleans temporary files after rename failure', async () => {
  const path = join(directory, 'target')
  await mkdir(path)
  const backend = createJsonFileSubmitStoreBackend(path)
  await expect(backend.load()).rejects.toThrow()
  await expect(backend.save([])).rejects.toThrow()
  expect(await readdir(directory)).toEqual(['target'])
})
