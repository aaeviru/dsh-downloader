import { pathToFileURL } from 'node:url'

// The shared client bundle preset comes from the DSH checkout; the host build
// inlines the two XML libraries so the published artifact is self-contained.
const checkout = process.env.DSH_CHECKOUT ?? '/home/aaevi/projects/deepseek-harness'
const { clientBundle } = await import(pathToFileURL(`${checkout}/packages/client/tsdown.client.ts`).href)

export default clientBundle(import.meta.dirname, ['lib/types/index.js'], {
  lib: { deps: { alwaysBundle: [/^fast-xml-/] } },
})
