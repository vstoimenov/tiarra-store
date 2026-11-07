import { sql } from '@/lib/db'
import { renderOrderEmail } from '@/lib/order-email'
import { sendTransactionalEmail } from '@/lib/brevo'

type Pending = { id: string; kind: 'customer' | 'merchant'; order_id: string; order_number: string; email: string | null; customer_name: string; phone: string; courier: string; total: number; subtotal: number; shipping: number; discount: number; delivery_address: string }
type Item = { product_id: string | null; title: string; variant_name: string | null; quantity: number; line_total: number }

/** A row lock prevents concurrent workers from sending the same message at once. */
export async function sendQueuedOrderEmail(queueId: string): Promise<boolean> {
  return sql.begin(async tx => {
    const [entry] = await tx<Pending[]>`select q.id,q.kind,o.id as order_id,o.order_number::text,o.email,o.customer_name,o.phone,o.courier,o.total::float8,o.subtotal::float8,o.shipping::float8,coalesce(o.discount_amount,0)::float8 as discount,o.delivery_address from store.order_email_queue q join store.orders o on o.id=q.order_id where q.id=${queueId} and q.status in ('pending','failed') for update of q skip locked`
    if (!entry) return false
    const items = await tx<Item[]>`select product_id,title,variant_name,quantity,line_total::float8 from store.order_items where order_id=${entry.order_id} order by id`
    const data = renderOrderEmail({number:entry.order_number,name:entry.customer_name,phone:entry.phone,email:entry.email,courier:entry.courier,total:entry.total,subtotal:entry.subtotal,shipping:entry.shipping,discount:entry.discount,delivery:entry.delivery_address,items:items.map(item=>({productId:item.product_id,title:item.title,variant:item.variant_name,quantity:item.quantity,total:item.line_total}))},entry.kind)
    try {
      await sendTransactionalEmail({to:{email:entry.kind==='customer'?entry.email!:'info@tiarracosmetics.com'},subject:data.subject,html:data.html,text:data.text,idempotencyKey:entry.id})
      await tx`update store.order_email_queue set status='sent',attempts=attempts+1,last_error=null,sent_at=now() where id=${entry.id}`
      return true
    } catch (error) {
      const message=error instanceof Error?error.message.slice(0,160):'EMAIL_SEND_FAILED'
      await tx`update store.order_email_queue set status='failed',attempts=attempts+1,last_error=${message} where id=${entry.id}`
      return false
    }
  })
}

export async function sendOrderEmails(orderNumber: string): Promise<void> {
  const rows=await sql<{id:string}[]>`select q.id from store.order_email_queue q join store.orders o on o.id=q.order_id where o.order_number=${orderNumber}::bigint and q.status in ('pending','failed') order by q.created_at`
  for (const row of rows) await sendQueuedOrderEmail(row.id)
}
