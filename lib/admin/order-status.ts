import { sql } from '@/lib/db'

/** Status and edit version must commit together, under the function's order lock. */
export async function updateAdminOrderStatus(orderNumber: string, status: string) {
  return sql.begin(async tx => {
    const [result] = await tx<{ status: string; changed: boolean; stock_released: boolean; ordyx_cancel_required: boolean }[]>`select * from store.update_order_status(${orderNumber}::bigint, ${status})`
    const [version] = result.changed
      ? await tx<{ updated_at: string }[]>`update store.orders set updated_at=clock_timestamp() where order_number=${orderNumber}::bigint returning updated_at::text`
      : await tx<{ updated_at: string }[]>`select updated_at::text from store.orders where order_number=${orderNumber}::bigint`
    return { ...result, updatedAt: version.updated_at }
  })
}
