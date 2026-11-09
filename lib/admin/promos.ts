import { sql } from '@/lib/db'

export type AdminPromo = {
  code: string; kind: 'percent' | 'fixed'; value: number; minSubtotal: number
  expiresAt: string | null; maxUses: number | null; uses: number; active: boolean; brands: string[]
}
export async function getAdminPromos(): Promise<AdminPromo[]> {
  return sql<AdminPromo[]>`select code,kind,value::float8 as value,min_subtotal::float8 as "minSubtotal",expires_at as "expiresAt",max_uses as "maxUses",uses,active,brands from store.promo_codes order by created_at desc`
}
