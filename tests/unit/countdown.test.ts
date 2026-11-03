import { describe, expect, it } from 'vitest'
import { timeLeft } from '@/lib/countdown'

const END = '2026-10-31T16:49:50.000Z'
const at = (iso: string) => new Date(iso).getTime()

describe('timeLeft', () => {
  it('splits the time left into whole days, hours and minutes', () => {
    // 1 day, 2 hours, 3 minutes and 4 seconds before the end.
    expect(timeLeft(END, at('2026-10-30T14:46:46.000Z'))).toEqual({ days: 1, hours: 2, minutes: 3 })
  })

  it('shows zeros while less than a minute is left', () => {
    expect(timeLeft(END, at('2026-10-31T16:49:10.000Z'))).toEqual({ days: 0, hours: 0, minutes: 0 })
  })

  it('is null at the end instant and after it', () => {
    expect(timeLeft(END, at(END))).toBeNull()
    expect(timeLeft(END, at('2026-11-02T00:00:00.000Z'))).toBeNull()
  })

  it('honours a UTC offset in the end time', () => {
    expect(timeLeft('2026-10-31T18:49:50+02:00', at('2026-10-31T16:49:49.000Z'))).toEqual({ days: 0, hours: 0, minutes: 0 })
    expect(timeLeft('2026-10-31T18:49:50+02:00', at('2026-10-31T16:49:50.000Z'))).toBeNull()
  })
})
