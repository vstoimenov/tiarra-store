'use client'

import { useEffect, useState } from 'react'
import { timeLeft } from '@/lib/countdown'
import styles from './Countdown.module.css'

const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function Ring({ value, of, label, pad }: { value: number; of: number; label: string; pad: boolean }) {
  const fraction = Math.min(value / of, 1)
  return (
    <div className={styles.unit}>
      <div className={styles.ring}>
        <svg viewBox="0 0 84 84" aria-hidden="true">
          <circle className={styles.track} cx="42" cy="42" r={RADIUS} />
          <circle
            className={styles.arc}
            cx="42"
            cy="42"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            transform="rotate(-90 42 42)"
          />
        </svg>
        <span className={styles.value}>{pad ? String(value).padStart(2, '0') : value}</span>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )
}

/**
 * Counts down to `endsAt` in days, hours and minutes, and removes itself once the time is up
 * (the offer around it stays). The clock is read only after mount: the server cannot know the
 * visitor's time, so it sends an empty box of the same height and nothing moves when the
 * numbers appear.
 */
export function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const left = now === null ? null : timeLeft(endsAt, now)
  if (now !== null && left === null) return null

  return (
    <div className={styles.countdown} data-testid="countdown" role="timer" aria-label="Офертата изтича след">
      <p className={styles.lead}>Офертата изтича след...</p>
      <div className={styles.rings}>
        {left && (
          <>
            <Ring value={left.days} of={7} label="ДНИ" pad={false} />
            <Ring value={left.hours} of={24} label="ЧАСА" pad />
            <Ring value={left.minutes} of={60} label="МИНУТИ" pad />
            <Ring value={left.seconds} of={60} label="СЕКУНДИ" pad />
          </>
        )}
      </div>
    </div>
  )
}
