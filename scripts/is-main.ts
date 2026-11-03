import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * True when the file whose `import.meta.url` is given is the script node was started with, false
 * when something else imported it (the tests import the helpers of a script). `process.argv[1]`
 * is the path as typed, but `import.meta.url` is the real path: through a symlink (a linked
 * checkout, /tmp on macOS) the two differ, so the typed path is resolved first. Comparing them
 * unresolved would skip main() silently and exit 0.
 */
export function isMain(metaUrl: string): boolean {
  const script = process.argv[1]
  if (!script) return false
  try {
    return metaUrl === pathToFileURL(realpathSync(script)).href
  } catch {
    return false
  }
}
