import { afterAll, beforeEach, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { updateAdminOrderStatus } from '@/lib/admin/order-status'
import { resetCatalog } from './helpers'

beforeEach(resetCatalog)
afterAll(() => sql.end())
async function fixture() {
  const [product] = await sql<{ id: string }[]>`insert into store.products(slug,title,gender,price,stock) values ('status-version','Продукт','unisex',10,10) returning id`
  const [order] = await sql<{ order_number: string }[]>`select order_number from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тестов клиент','0888123456','test@example.invalid','econt','address',null,'София','1000','ул. Тестова 1','',${sql.json([{ productId: product.id, variantId: null, quantity: 1 }])},'')`
  // Ensure a visibly older edit version without relying on timer sleeps.
  await sql`update store.orders set updated_at='2026-01-01' where order_number=${order.order_number}`
  return order.order_number
}
it('changes the edit version with a status change and preserves it on an idempotent retry', async () => {
  const number = await fixture()
  const result = await updateAdminOrderStatus(number, 'confirmed')
  expect(result.changed).toBe(true)
  expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date('2026-01-01').getTime())
  const retry = await updateAdminOrderStatus(number, 'confirmed')
  expect(retry.changed).toBe(false)
  expect(retry.updatedAt).toBe(result.updatedAt)
  await expect(updateAdminOrderStatus(number, 'completed')).rejects.toThrow('INVALID_STATUS_TRANSITION')
  const [current] = await sql<{ status: string; updated_at: string }[]>`select status,updated_at::text from store.orders where order_number=${number}`
  expect(current).toEqual({ status: 'confirmed', updated_at: result.updatedAt })
})
it('can atomically enqueue both order emails with app-role privileges on a fresh schema', async () => {
  const number = await fixture()
  await sql.begin(async tx => {
    await tx`set local role tiarra_app`
    for (const kind of ['merchant', 'customer', 'merchant']) {
      await tx`insert into store.order_email_queue(order_id,kind) select id,${kind} from store.orders where order_number=${number} on conflict(order_id,kind) do nothing`
    }
    const rows = await tx<{ kind: string; status: string; attempts: number }[]>`select kind,status,attempts from store.order_email_queue order by kind`
    expect(rows).toEqual([{ kind: 'customer', status: 'pending', attempts: 0 }, { kind: 'merchant', status: 'pending', attempts: 0 }])
  })
  await expect(sql.begin(async tx => { await tx`set local role anon`; return tx`select * from store.order_email_queue` })).rejects.toThrow('permission denied')
})
