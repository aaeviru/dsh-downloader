import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { DownloadNamespace } from './namespace.ts'
import { DownloaderPanel } from './DownloaderPanel.tsx'
import { DownloaderIcon } from './DownloaderIcon.tsx'
import { NS, en, zh } from './locales.ts'

/**
 * Register localized downloader seats with context-owned cleanup.
 * @param ctx - Client context owning the locale dictionaries and slot registrations.
 * @param download - Download operations injected into the downloader panel.
 */
export function mountDownloader(ctx: Context, download: DownloadNamespace): void {
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-downloader: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'downloader', locale: NS, inject: () => ({ t, download }),
  }, DownloaderPanel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'downloader', order: 40, locale: NS, label: () => t('panel'),
  }, DownloaderIcon))
}
