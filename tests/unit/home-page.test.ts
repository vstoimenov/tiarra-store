import { describe, expect, it } from 'vitest'
import * as home from '@/app/page'

describe('home page', () => {
  // A campaign section with a `showUntil` must drop out of `/` without a deploy, so the page
  // has to be rebuilt on a timer. Remove the export and this fails.
  it('home revalidates every 5 minutes', () => {
    expect(home.revalidate).toBe(300)
  })
})
