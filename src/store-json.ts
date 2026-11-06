import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SubmitStoreBackend } from './store.ts'

/**
 * Backend storing submit records as a JSON document at `path`.
 * @param path - Destination file; missing files load as empty, while malformed contents reject.
 * @returns A backend that replaces the file through a temporary file and applies owner-only permissions.
 */
export function createJsonFileSubmitStoreBackend(path: string): SubmitStoreBackend {
  return {
    async load() {
      let contents: string
      try {
        contents = await readFile(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw error
      }
      try {
        const value: unknown = JSON.parse(contents)
        if (!Array.isArray(value)) throw new Error()
        return value.map((record: unknown) => {
          if (typeof record !== 'object' || record === null || !('key' in record) || !('gid' in record)
            || typeof record.key !== 'string' || typeof record.gid !== 'string') throw new Error()
          return { key: record.key, gid: record.gid }
        })
      } catch {
        throw new Error(`Invalid submit store at ${path}: expected a JSON array of { key: string, gid: string } records`)
      }
    },
    async save(records) {
      await mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, JSON.stringify(records), { mode: 0o600, flag: 'wx' })
        await rename(temporary, path)
        await chmod(path, 0o600)
      } finally {
        await rm(temporary, { force: true })
      }
    },
  }
}
