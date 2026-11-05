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
    include: ['tests/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8' as const,
      include: ['src/**'],
      // The generated dsh-downloader/remote artifact is absent; the entry cannot be imported in tests.
      exclude: ['src/client/index.ts'],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
}
