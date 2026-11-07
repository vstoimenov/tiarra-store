import { sql } from '@/lib/db'
import { renderOrderEmail } from '@/lib/order-email'
import { sendTransactionalEmail } from '@/lib/brevo'

type Pending = { id: string; kind: 'customer' | 'merchant'; order_id: string; order_number: string; email: string | null; customer_name: string; total: number; delivery_address: string }
type Item = { title: string; variant_name: string | null; quantity: number; line_total: number }

/** A row lock prevents concurrent workers from sending the same message at once. */
export async function sendQueuedOrderEmail(queueId: string): Promise<boolean> {
  return sql.begin(async tx => {
    const [entry] = await tx<Pending[]>`select q.id,q.kind,o.id as order_id,o.order_number::text,o.email,o.customer_name,o.total::float8,o.delivery_address from store.order_email_queue q join store.orders o on o.id=q.order_id where q.id=${queueId} and q.status in ('pending','failed') for update of q skip locked`
    if (!entry) return false
    const items = await tx<Item[]>`select title,variant_name,quantity,line_total::float8 from store.order_items where order_id=${entry.order_id} order by id`
    const data = renderOrderEmail({number:entry.order_number,name:entry.customer_name,total:entry.total,delivery:entry.delivery_address,items:items.map(item=>({title:item.title,variant:item.variant_name,quantity:item.quantity,total:item.line_total}))})
    try {
      await sendTransactionalEmail({to:{email:entry.kind==='customer'?entry.email!:'info@tiarracosmetics.com'},subject:entry.kind==='merchant'?`Нова поръчка №${entry.order_number} | Tiarra Cosmetics`:data.subject,html:data.html,text:data.text,idempotencyKey:entry.id})
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
