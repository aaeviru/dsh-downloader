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
      // Client code renders in jsdom through component tests; it is not part of the node coverage gate.
      // types.ts is a type-only re-export and emits no runtime code.
      exclude: ['src/client/**', 'src/types.ts'],
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
}
