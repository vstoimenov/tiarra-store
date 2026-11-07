export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
export const LEGACY_OFFER_ENDS_AT = '2026-10-31T16:49:50.000Z'
export const CURRENT_OFFER_ENDS_AT = '2026-11-30T21:59:59.000Z'

/** Keeps the already-published October campaign visible until its replacement is saved in admin. */
export function effectiveOfferEnd(endsAt: string): string {
  return endsAt === LEGACY_OFFER_ENDS_AT ? CURRENT_OFFER_ENDS_AT : endsAt
}

/**
 * Whole days, hours, minutes and seconds from `now` (ms since the epoch) to `endsAt`;
 * null once the end instant has come.
 */
export function timeLeft(endsAt: string, now: number): TimeLeft | null {
  const left = Date.parse(endsAt) - now
  if (!(left > 0)) return null
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
    seconds: Math.floor((left % MINUTE) / 1000),
  }
}
