import { afterAll, beforeEach, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { getAnalyticsReport } from '@/lib/admin/analytics'
import { getAdminOrders } from '@/lib/admin/orders'
import { resetCatalog } from './helpers'

beforeEach(async () => {
  await resetCatalog() // Refuses to truncate anywhere except the local test database.
  await sql`truncate store.orders, store.visit_sessions cascade`
})
afterAll(() => sql.end())

it.each([
  ['2026-11-17', '2026-11-16T22:00:00Z', '2026-11-17T22:00:00Z'],
  ['2026-07-17', '2026-07-16T21:00:00Z', '2026-07-17T21:00:00Z'],
  ['2026-03-29', '2026-03-28T22:00:00Z', '2026-03-29T21:00:00Z'],
  ['2026-10-25', '2026-10-24T21:00:00Z', '2026-10-25T22:00:00Z'],
])('counts orders and visits inside the Sofia calendar day %s, including DST changes', async (day, start, end) => {
  const times = [new Date(Date.parse(start) - 1).toISOString(), start, new Date(Date.parse(end) - 1).toISOString(), end]
  for (const [index, time] of times.entries()) {
    const session = crypto.randomUUID()
    await sql`insert into store.visit_sessions(id, visitor_id, started_at) values (${session}, ${crypto.randomUUID()}, ${time})`
    await sql`insert into store.orders(customer_name, phone, courier, delivery_address, subtotal, shipping, total, created_at, visit_session_id)
      values ('Тестов клиент', '0888123456', 'speedy', 'Тестов офис', 50, 0, 50, ${time}, ${index === 1 ? session : null})`
  }
  await sql`insert into store.orders(customer_name, phone, courier, delivery_address, subtotal, shipping, total, created_at, status)
    values ('Анулирана', '0888123456', 'speedy', 'Тестов офис', 50, 0, 50, ${start}, 'cancelled')`

  const report = await getAnalyticsReport(day, day)
  expect(report.orders).toBe(2) // One tracked order and one without analytics consent.
  expect(report.orderValue).toBe(100)
  expect(report.averageOrder).toBe(50)
  expect(report.sessions).toBe(2)
  expect(report.trackedOrders).toBe(1)
  expect(report.conversionRate).toBe(50)
  expect(report.days).toEqual([{ date: day, sessions: 2, orders: 2, value: 100 }])
  // The order list includes all statuses, including cancelled orders.
  expect(await getAdminOrders()).toHaveLength(5)
})
