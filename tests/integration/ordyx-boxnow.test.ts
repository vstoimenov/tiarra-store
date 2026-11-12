import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import { resetCatalog } from './helpers'

beforeEach(async () => { await resetCatalog(); await sql`update store.commerce_settings set boxnow_enabled=true,boxnow_price=2.49,free_shipping_threshold=39 where singleton` })
afterAll(() => sql.end())

describe('BOX NOW order pricing', () => {
  it.each([[20, 2.49], [40, 0]])('calculates shipping for subtotal %s', async (price, shipping) => {
    const [product] = await sql<{ id: string }[]>`insert into store.products(slug,title,gender,price,is_hidden) values ('boxnow-test','Продукт','unisex',${price},false) returning id`
    const items = [{ productId: product.id, variantId: null, quantity: 1 }]
    const [result] = await sql<{ total: number }[]>`select total::float8 as total from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тест Клиент','0888123456','test@example.com','boxnow','automat','boxnow:9133','Айдемир','7538','Адрес на автомат','',${sql.json(items)},'')`
    expect(result.total).toBeCloseTo(price + shipping, 2)
  })
  it('rejects orders when BOX NOW is disabled', async () => {
    await sql`update store.commerce_settings set boxnow_enabled=false where singleton`
    const [product] = await sql<{ id: string }[]>`insert into store.products(slug,title,gender,price,is_hidden) values ('boxnow-disabled','Продукт','unisex',20,false) returning id`
    await expect(sql`select * from store.create_order_with_settings_and_promo(${crypto.randomUUID()},'Тест Клиент','0888123456','test@example.com','boxnow','automat','boxnow:9133','Айдемир','7538','Адрес на автомат','',${sql.json([{productId:product.id,variantId:null,quantity:1}])},'')`).rejects.toThrow('COURIER_DISABLED')
  })
})
