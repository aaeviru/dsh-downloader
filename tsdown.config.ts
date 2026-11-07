import { pathToFileURL } from 'node:url'

// The shared client bundle preset comes from the DSH checkout. Every package the
// plugin needs beyond the Host's own module graph is inlined, so installing the
// published tarball cannot materialize a second copy of Host services.
const checkout = process.env.DSH_CHECKOUT ?? '/home/aaevi/projects/deepseek-harness'
const { clientBundle } = await import(pathToFileURL(`${checkout}/packages/client/tsdown.client.ts`).href)

export default clientBundle(import.meta.dirname, ['lib/types/index.js'], {
  lib: { deps: { alwaysBundle: [/^fast-xml-/, /^@deepseek-ai\/dsh-tools$/, /^@deepseek-ai\/dsh-typert-protocol$/, /^@deepseek-ai\/dsh-credentials$/, /^@deepseek-ai\/schemastery$/, /^zod$/] } },
})
