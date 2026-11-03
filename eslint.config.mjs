import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// pnpm does not expose @eslint/eslintrc at the project root, so load it the way
// eslint itself does (no extra dependency needed).
const require = createRequire(import.meta.url)
const { FlatCompat } = createRequire(require.resolve('eslint/package.json'))('@eslint/eslintrc')

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Project rule: plain <img> with srcset (imageUrl()/imageSrcSet()), never next/image.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default eslintConfig
