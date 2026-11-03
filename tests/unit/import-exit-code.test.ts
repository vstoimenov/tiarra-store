import { describe, expect, it } from 'vitest'
import { EXIT_FAILED, EXIT_OK, EXIT_WARNINGS, importExitCode } from '@/scripts/import/exit-code'

describe('importExitCode', () => {
  it('is 0 for a clean run', () => {
    expect(EXIT_OK).toBe(0)
    expect(importExitCode({ failedPages: 0, warnings: 0 })).toBe(0)
  })

  it('is 3 when the run finished with warnings (a failed image, say)', () => {
    expect(EXIT_WARNINGS).toBe(3)
    expect(importExitCode({ failedPages: 0, warnings: 1 })).toBe(3)
    expect(importExitCode({ failedPages: 0, warnings: 12 })).toBe(3)
  })

  it('is 1 when a page could not be imported at all, which outranks warnings', () => {
    expect(EXIT_FAILED).toBe(1)
    expect(importExitCode({ failedPages: 1, warnings: 1 })).toBe(1)
    expect(importExitCode({ failedPages: 2, warnings: 5 })).toBe(1)
  })
})
