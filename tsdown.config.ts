/**
 * Bundle the package root as a self-contained ESM artifact.
 *
 * This plugin lives in its own repository, so nothing here may assume it sits
 * inside the dsh checkout; the shared build inputs are referenced by absolute
 * path from ./tsconfig.json instead.
 */
export default [
  {
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
]
