// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { mountDownloader } from '../src/client/mount.ts'
import { DownloaderIcon } from '../src/client/DownloaderIcon.tsx'
import { en, zh } from '../src/client/locales.ts'
import type { DownloadNamespace } from '../src/client/namespace.ts'

afterEach(cleanup)
it('registers localized seats with disposers and renders both icon states', () => {
  const dispose = vi.fn()
  const registrations: { label?: () => string; inject?: () => object }[] = []
  const ctx: Context = Object.assign(new Context(), {
    locale: { register: vi.fn(() => dispose), bind: () => (key: keyof typeof en) => en[key] },
    slots: {
      inject: (_name: string, callback: () => void) => callback(),
      register: (options: { label?: () => string; inject?: () => object }) => { registrations.push(options); return dispose },
    },
    effect: (callback: () => () => void) => callback(),
  })
  const value = { history: [], favorites: [] }
  const download: DownloadNamespace = {
    preferences: async () => ({ ok: true, value }), recordSearch: async () => ({ ok: true, value }),
    toggleFavorite: async () => ({ ok: true, value }), deleteSearch: async () => ({ ok: true, value }), clearHistory: async () => ({ ok: true, value }),
    list: async () => ({ ok: true, value: [] }), search: async () => ({ ok: true, value: [] }), submissions: async () => ({ ok: true, value: [] }),
    add: vi.fn(), resubmit: vi.fn(), refresh: vi.fn(),
  }
  mountDownloader(ctx, download)
  expect(ctx.locale.register).toHaveBeenCalledWith('downloader', { en, zh })
  expect(registrations[0]?.inject?.()).toMatchObject({ download })
  expect(registrations[1]?.label?.()).toBe(en.panel)
  const view = render(<DownloaderIcon active={false} size={24} />)
  expect(view.container.querySelector('svg')?.style.color).toContain('secondary')
  view.rerender(<DownloaderIcon active size={24} />)
  expect(view.container.querySelector('svg')?.style.color).toContain('primary')
})
