import { z } from 'zod'

const money = z.number().finite().min(0).max(999999).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Използвай до два знака след запетаята.')
export const orderEditSchema = z.object({
  expectedVersion: z.string().min(1).max(80).refine(value => Number.isFinite(Date.parse(value)), 'Невалидна версия на поръчката.'),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.literal(''), z.string().trim().email().max(160)]),
  courier: z.enum(['econt', 'speedy', 'boxnow']),
  deliveryType: z.enum(['office', 'automat', 'address']),
  officeId: z.string().max(120).nullable(),
  city: z.string().trim().max(100),
  postCode: z.string().trim().max(20),
  deliveryAddress: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000),
  shipping: money,
  discountAmount: money,
  items: z.array(z.object({
    id: z.string().uuid().nullable(),
    productId: z.string().uuid().nullable(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().int().min(1).max(99),
    unitPrice: money,
  })).min(1).max(50),
}).superRefine((data, ctx) => {
  if (data.courier === 'boxnow' && data.deliveryType !== 'automat') ctx.addIssue({ code: 'custom', path: ['deliveryType'], message: 'BOX NOW доставя само до автомат.' })
  if (data.deliveryType === 'address' ? !!data.officeId || !data.city || !data.postCode : !data.officeId) ctx.addIssue({ code: 'custom', path: ['officeId'], message: 'Попълни адрес или избери офис/автомат.' })
  const subtotal = data.items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0)
  if (Math.round(data.discountAmount * 100) > subtotal) ctx.addIssue({ code: 'custom', path: ['discountAmount'], message: 'Отстъпката не може да надвишава стойността на продуктите.' })
  if (subtotal + Math.round(data.shipping * 100) > 9999999999) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Стойността на поръчката е твърде голяма.' })
  const keys = data.items.map(item => item.id ?? `${item.productId}:${item.variantId ?? ''}`)
  if (new Set(keys).size !== keys.length || data.items.some(item => !item.id && !item.productId)) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Невалидни или повтарящи се продукти.' })
})
export type OrderEdit = z.infer<typeof orderEditSchema>
export function editTotals(items: {quantity:number;unitPrice:number}[], shipping:number, discount:number) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round((Number.isFinite(item.unitPrice)?item.unitPrice:0) * 100) * (Number.isFinite(item.quantity)?item.quantity:0), 0)
  return { subtotal: subtotalCents / 100, total: (subtotalCents + Math.round((Number.isFinite(shipping)?shipping:0) * 100) - Math.round((Number.isFinite(discount)?discount:0) * 100)) / 100 }
}
