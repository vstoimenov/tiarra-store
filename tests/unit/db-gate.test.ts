import { describe, expect, it } from 'vitest'
import { createSlots } from '@/lib/db-gate'

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('createSlots', () => {
  it('never lets more than max tasks hold a slot at once', async () => {
    const slots = createSlots(3)
    let active = 0
    let peak = 0
    let finished = 0

    await Promise.all(
      Array.from({ length: 12 }, async () => {
        await slots.acquire()
        active++
        peak = Math.max(peak, active)
        await tick()
        active--
        finished++
        slots.release()
      }),
    )

    expect(finished).toBe(12)
    expect(peak).toBe(3)
  })

  it('hands a released slot to the oldest waiter, so a newcomer cannot jump the queue', async () => {
    const slots = createSlots(1)
    const order: string[] = []

    await slots.acquire() // A holds the only slot
    const b = slots.acquire().then(() => order.push('B'))
    slots.release() // A done: the slot goes to B
    const c = slots.acquire().then(() => order.push('C')) // arrives right after the release
    await tick()

    expect(order).toEqual(['B'])

    slots.release() // B done
    await Promise.all([b, c])
    expect(order).toEqual(['B', 'C'])
  })
})
