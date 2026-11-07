import { Context } from '@deepseek-ai/cordis'
import { expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.ts'
import { mountDownloader } from '../src/client/mount.ts'
vi.mock('../src/client/mount.ts', () => ({ mountDownloader: vi.fn() }))

it.each([false, true])('disposes transport and seats on unload or failed mount (%s)', async fail => {
  const transportDispose = vi.fn(async () => {})
  const uiDispose = vi.fn(async () => {})
  const transport = Object.assign(Promise.resolve(), { dispose: transportDispose })
  const ui = Object.assign(fail ? Promise.reject(new Error('mount failed')) : Promise.resolve(), { dispose: uiDispose })
  const mount = vi.fn(async () => {})
  const ctx: Context = Object.assign(new Context(), {
    remote: { $mount: mount, download: {} },
    plugin: (callback: (owner: Context) => Promise<void>) => { void callback(ctx); return transport },
    inject: (_names: string[], callback: (scope: Context) => void) => { callback(ctx); return ui },
    effect: (callback: () => Generator<() => Promise<void>>) => async () => { for (const dispose of callback()) await dispose() },
  })
  expect(inject).toEqual(['remote', 'slots', 'locale'])
  if (fail) await expect(apply(ctx)).rejects.toThrow('mount failed')
  else await (await apply(ctx))()
  expect(mount).toHaveBeenCalled()
  expect(mountDownloader).toHaveBeenCalled()
  expect(transportDispose).toHaveBeenCalledOnce()
  expect(uiDispose).toHaveBeenCalledOnce()
})
