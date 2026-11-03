export interface TimeLeft {
  days: number
  hours: number
  minutes: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Whole days, hours and minutes from `now` (ms since the epoch) to `endsAt` (an ISO date);
 * null once the end instant has come. Under a minute left it is 0/0/0, still not over.
 */
export function timeLeft(endsAt: string, now: number): TimeLeft | null {
  const left = Date.parse(endsAt) - now
  if (!(left > 0)) return null
  return {
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
  }
}
