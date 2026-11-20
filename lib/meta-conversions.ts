import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { sql } from '@/lib/db'
import { getCommerceSettings } from '@/lib/commerce-settings'
import { normalizeMetaContext, metaPurchaseEventId, type MetaContext } from '@/lib/meta-context'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const MAX_ATTEMPTS = 10
const MAX_AGE_SECONDS = 6 * 86400
export type MetaCapiStatus = { tokenConfigured: boolean; queueAvailable: boolean; environmentAllowed: boolean; testMode: boolean; pending: number; failed: number; sent: number; lastSentAt: string | null; lastError: string | null }
type Purchase = { id: string; number: string; email: string | null; phone: string; total: number; createdAt: Date | string; items: { id: string; quantity: number; price: number }[] }
type Queued = { id: string; pixelId: string; payload: { event_time: number }; testCode: string | null; attempts: number; cancelled: boolean }

function environmentAllowed() {
 return process.env.SITE_ENV === 'production' || (!process.env.SITE_ENV && process.env.VERCEL_ENV === 'production') || Boolean(testCode())
}
function testCode() { const value = process.env.META_CONVERSIONS_TEST_EVENT_CODE?.trim(); return value && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : null }
export async function metaQueueAvailable() {
 const [row] = await sql<{ available: boolean }[]>`select to_regclass('store.meta_conversion_queue') is not null as available`
 return row?.available ?? false
}
export async function getMetaCapiStatus(): Promise<MetaCapiStatus> {
 const queueAvailable = await metaQueueAvailable()
 const status: MetaCapiStatus = { tokenConfigured: Boolean(process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim()), queueAvailable, environmentAllowed: environmentAllowed(), testMode: Boolean(testCode()), pending: 0, failed: 0, sent: 0, lastSentAt: null, lastError: null }
 if (!queueAvailable) return status
 const [counts] = await sql<{ pending: number; failed: number; sent: number; lastSentAt: string | null; lastError: string | null }[]>`select
 count(*) filter(where status in ('pending','failed') and next_attempt_at is not null)::int as pending,
 count(*) filter(where status='failed' and next_attempt_at is null)::int as failed,
 count(*) filter(where status='sent' and test_event_code is null)::int as sent,max(sent_at) filter(where test_event_code is null)::text as "lastSentAt",
 (array_agg(last_error order by created_at desc) filter(where status='failed'))[1] as "lastError"
 from store.meta_conversion_queue where created_at>now()-interval '7 days'`
 return { ...status, ...counts }
}
export function normalizedMetaPhone(phone: string) {
 let digits = phone.replace(/\D/g, '')
 if (digits.startsWith('00')) digits = digits.slice(2)
 if (/^0\d{8,9}$/.test(digits)) digits = '359' + digits.slice(1)
 else if (/^[89]\d{8}$/.test(digits)) digits = '359' + digits
 return /^\d{8,15}$/.test(digits) ? digits : null
}
export function buildMetaPurchase(order: Purchase, context: MetaContext, sourceUrl: string, userAgent: string, clientIp?: string) {
 const email = order.email?.trim().toLowerCase(), phone = normalizedMetaPhone(order.phone)
 return {
  event_name: 'Purchase', event_id: metaPurchaseEventId(order.number), event_time: Math.floor(new Date(order.createdAt).getTime() / 1000),
  action_source: 'website', event_source_url: sourceUrl,
  user_data: { ...(email ? { em: [hash(email)] } : {}), ...(phone ? { ph: [hash(phone)] } : {}), client_user_agent: userAgent,
   ...(clientIp && isIP(clientIp) ? { client_ip_address: clientIp } : {}), ...(context.fbp ? { fbp: context.fbp } : {}), ...(context.fbc ? { fbc: context.fbc } : {}) },
  custom_data: { currency: 'EUR', value: order.total, order_id: order.number, content_type: 'product',
   content_ids: order.items.map(item => item.id), contents: order.items.map(item => ({ id: item.id, quantity: item.quantity, item_price: item.price })),
   num_items: order.items.reduce((count, item) => count + item.quantity, 0) },
 }
}
/** Runs after checkout committed. A failure here cannot roll back or duplicate an order. */
export async function queueMetaPurchase(orderNumber: string, suppliedContext: unknown, request: Request): Promise<boolean> {
 const context = normalizeMetaContext(suppliedContext)
 if (!context.consent || !process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim() || !environmentAllowed()) return false
 const settings = await getCommerceSettings()
 const pixelId = settings.metaPixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID
 if (!pixelId || !/^\d{5,25}$/.test(pixelId) || !(await metaQueueAvailable())) return false
 const userAgent = request.headers.get('user-agent')?.trim().slice(0, 512)
 if (!userAgent) return false
 const source = new URL('/store/checkout', process.env.SITE_URL)
 if (source.protocol !== 'https:') return false
 const [order] = await sql<Purchase[]>`select o.id,o.order_number::text as number,o.email,o.phone,o.total::float8 as total,o.created_at as "createdAt",
 coalesce(jsonb_agg(jsonb_build_object('id',coalesce(oi.variant_id,oi.product_id)::text,'quantity',oi.quantity,'price',oi.unit_price::float8) order by oi.id) filter(where oi.product_id is not null),'[]'::jsonb) as items
 from store.orders o left join store.order_items oi on oi.order_id=o.id where o.order_number=${orderNumber}::bigint and o.status<>'cancelled' group by o.id`
 if (!order) return false
 const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined
 const payload = buildMetaPurchase(order, context, source.href, userAgent, ip)
 await sql`insert into store.meta_conversion_queue(order_id,pixel_id,payload,test_event_code) values(${order.id},${pixelId},${sql.json(payload)},${testCode()}) on conflict(order_id) do nothing`
 return true
}

/** Claim before sending; uncertain provider replies retry with the same event_id. */
export async function sendMetaPurchase(orderNumber?: string): Promise<boolean> {
 const token = process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim()
 if (!token || !environmentAllowed() || !(await metaQueueAvailable())) return false
 const version = process.env.META_CONVERSIONS_API_VERSION?.trim() || 'v25.0'
 if (!/^v\d{2}\.\d+$/.test(version)) return false
 return sql.begin(async tx => {
  const [row] = await tx<Queued[]>`select q.order_id as id,q.pixel_id as "pixelId",q.payload,q.test_event_code as "testCode",q.attempts,o.status='cancelled' as cancelled
  from store.meta_conversion_queue q join store.orders o on o.id=q.order_id
  where q.status in ('pending','failed') and q.next_attempt_at<=now() and q.attempts<${MAX_ATTEMPTS}
   and (${orderNumber ?? null}::bigint is null or o.order_number=${orderNumber ?? null}::bigint)
  order by q.next_attempt_at limit 1 for update of q skip locked`
  if (!row) return false
  const age = Date.now() / 1000 - row.payload?.event_time
  if (row.cancelled || !Number.isFinite(age) || age > MAX_AGE_SECONDS || age < -300) {
   await tx`update store.meta_conversion_queue set status='skipped',payload=null,next_attempt_at=null,last_error='EXPIRED_OR_CANCELLED' where order_id=${row.id}`
   return false
  }
  const { error: failure, retryable, ok } = await postMetaEvent(row.pixelId, row.payload, token, row.testCode, version)
  if (ok) {
   await tx`update store.meta_conversion_queue set status='sent',attempts=attempts+1,sent_at=now(),next_attempt_at=null,last_error=null,payload=null where order_id=${row.id}`
   return true
  }
  const retry = retryable && row.attempts + 1 < MAX_ATTEMPTS
  const delay = Math.min(3600, 60 * 2 ** row.attempts)
  await tx`update store.meta_conversion_queue set status='failed',attempts=attempts+1,last_error=${failure},next_attempt_at=case when ${retry} then now()+${delay}*interval '1 second' else null end where order_id=${row.id}`
  return false
 })
}

async function postMetaEvent(pixelId: string, payload: unknown, token: string, test: string | null, version: string) {
 try {
  const response = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ access_token: token, data: [payload], ...(test ? { test_event_code: test } : {}) }), signal: AbortSignal.timeout(8000) })
  const body = await response.json().catch(() => null) as { events_received?: number; error?: { code?: number; is_transient?: boolean } } | null
  if (response.ok && body?.events_received === 1) return { ok: true, error: null, retryable: false }
  // Do not persist provider messages: they can echo personal data or tokens.
  const code = Number.isInteger(body?.error?.code) ? body!.error!.code : undefined
  return { ok: false, error: `META_HTTP_${response.status}${code !== undefined ? `_CODE_${code}` : ''}`, retryable: response.status === 429 || response.status >= 500 || response.ok || body?.error?.is_transient === true || (code !== undefined && [1,2,4,17,32,613].includes(code)) }
 } catch { return { ok: false, error: 'META_NETWORK_ERROR', retryable: true } }
}
/** Explicit admin action. Test code is mandatory; this never creates a store order. */
export async function sendMetaIntegrationTest(request: Request) {
 const test = testCode(), token = process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim()
 if (!test) return { ok: false, error: 'Добави META_CONVERSIONS_TEST_EVENT_CODE във Vercel, за да изпратиш тест само към Test Events.' }
 if (!token) return { ok: false, error: 'Липсва META_CONVERSIONS_ACCESS_TOKEN.' }
 const settings = await getCommerceSettings(), pixelId = settings.metaPixelId ?? process.env.NEXT_PUBLIC_META_PIXEL_ID
 if (!pixelId || !/^\d{5,25}$/.test(pixelId)) return { ok: false, error: 'Добави и запази Meta Pixel ID.' }
 const version = process.env.META_CONVERSIONS_API_VERSION?.trim() || 'v25.0'
 if (!/^v\d{2}\.\d+$/.test(version)) return { ok: false, error: 'Невалидна META_CONVERSIONS_API_VERSION.' }
 const source = new URL('/store/checkout', process.env.SITE_URL)
 const payload = buildMetaPurchase({ id: 'integration-test', number: `test-${crypto.randomUUID()}`, email: 'test@example.com', phone: '', total: 1, createdAt: new Date(), items: [{ id: 'tiarra-meta-test', quantity: 1, price: 1 }] }, { consent: true }, source.href, request.headers.get('user-agent')?.slice(0,512) || 'Tiarra integration test')
 return postMetaEvent(pixelId, payload, token, test, version)
}
