/**
 * Local test configuration for this standalone repository.
 *
 * Standard TypeScript decorators (used by `@Remote`) are not parsed by Vite's
 * default pipeline, so the DSH checkout's pre-transform plugin is reused. The
 * checkout also supplies the Vitest/TypeScript runtime for this config.
 */

import { standardDecoratorPlugin } from '/home/aaevi/projects/deepseek-harness/vitest.shared.ts'

export default {
  plugins: [standardDecoratorPlugin()],
  test: {
    include: ['tests/**/*.spec.ts'],
    coverage: { provider: 'v8' as const, include: ['src/**'] },
  },
}
