import { expect, it } from 'vitest'
import { apply } from '../src/index.ts'

it('registers nothing and ignores its context argument', () => {
  // @ts-expect-error The placeholder is acceptable because apply never touches its argument.
  expect(() => { apply(null) }).not.toThrow()
})
