import { z } from 'zod'

export const promoCodeSchema = z.string().trim().toUpperCase().max(32).regex(/^([A-Z0-9_-]{3,32})?$/).optional().default('')
export const promoAdminSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/),
  kind: z.enum(['percent', 'fixed']),
  value: z.number().positive().max(999999).multipleOf(0.01),
  minSubtotal: z.number().nonnegative().max(999999).multipleOf(0.01),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  maxUses: z.number().int().positive().max(1000000).nullable(),
  active: z.boolean(),
  brands: z.array(z.string().trim().min(1).max(120)).max(200).default([]),
}).refine(data => data.kind !== 'percent' || data.value <= 100, { message: 'Процентът трябва да е до 100.' })

export function promoError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('PROMO_BRAND')) return 'Промокодът не важи за марките в количката.'
  if (message.includes('PROMO_MINIMUM')) return 'Не е достигната минималната сума за този промокод.'
  if (message.includes('PROMO_INVALID')) return 'Промокодът е невалиден, изтекъл или изчерпан.'
  return null
}
