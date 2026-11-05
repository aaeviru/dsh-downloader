import { pathToFileURL } from 'node:url'

// This package builds against the DSH checkout's shared client bundle preset;
// the checkout is located by path so the package does not depend on where it
// lives relative to the harness.
const checkout = process.env.DSH_CHECKOUT ?? '/home/aaevi/projects/deepseek-harness'
const { clientBundle } = await import(pathToFileURL(`${checkout}/packages/client/tsdown.client.ts`).href)

export default clientBundle(import.meta.dirname, ['lib/types/index.js'])
