import { timingSafeEqual } from 'node:crypto'
import { sql } from '@/lib/db'
import { sendQueuedOrderEmail } from '@/lib/order-email-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const expected = Buffer.from(`Bearer ${secret ?? ''}`)
  const supplied = Buffer.from(request.headers.get('authorization') ?? '')
  if (!secret || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return Response.json({error:'Unauthorized'},{status:401})
  if (!process.env.BREVO_API_KEY) return Response.json({error:'Brevo is not configured'},{status:503})
  const entries = await sql<{id:string}[]>`select id from store.order_email_queue where status in ('pending','failed') and attempts < 1000 and created_at > now() - interval '7 days' and created_at < now() - interval '5 minutes' order by created_at limit 3`
  let sent=0
  for(const entry of entries) { try { if(await sendQueuedOrderEmail(entry.id)) sent++ } catch { console.error('Scheduled order email retry failed') } }
  return Response.json({attempted:entries.length,sent},{headers:{'Cache-Control':'no-store'}})
}
