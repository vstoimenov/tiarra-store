import { mkdtempSync, rmSync, symlinkSync, writeFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isMain } from '@/scripts/is-main'

describe('isMain', () => {
  const originalArgv1 = process.argv[1]
  let dir: string

  beforeEach(() => {
    // realpath: on macOS the temp dir itself is behind a symlink (/var -> /private/var).
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'is-main-')))
  })

  afterEach(() => {
    process.argv[1] = originalArgv1
    rmSync(dir, { recursive: true, force: true })
  })

  it('is true when the script was started by its own path', () => {
    const script = join(dir, 'script.ts')
    writeFileSync(script, '')
    process.argv[1] = script

    expect(isMain(pathToFileURL(script).href)).toBe(true)
  })

  it('is true when the script was started through a symlink (node reports the real path as import.meta.url)', () => {
    const script = join(dir, 'script.ts')
    const link = join(dir, 'link.ts')
    writeFileSync(script, '')
    symlinkSync(script, link)
    process.argv[1] = link

    expect(isMain(pathToFileURL(script).href)).toBe(true)
  })

  it('is false when another file started the process (the tests import the script)', () => {
    const script = join(dir, 'script.ts')
    const runner = join(dir, 'runner.ts')
    writeFileSync(script, '')
    writeFileSync(runner, '')
    process.argv[1] = runner

    expect(isMain(pathToFileURL(script).href)).toBe(false)
  })

  it('is false without a script path or with one that does not exist', () => {
    const script = join(dir, 'script.ts')
    writeFileSync(script, '')

    process.argv[1] = ''
    expect(isMain(pathToFileURL(script).href)).toBe(false)

    process.argv[1] = join(dir, 'missing.ts')
    expect(isMain(pathToFileURL(script).href)).toBe(false)
  })
})
