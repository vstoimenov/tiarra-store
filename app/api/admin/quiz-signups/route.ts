import { sql } from '@/lib/db'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
/** Admin authentication is enforced by middleware for every /api/admin route. */
export async function GET() {
  const rows = await sql<{ email: string; created_at: string }[]>`select email, created_at::text from store.quiz_email_signups order by created_at desc`
  const csvCell = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
  const csv = '\ufeffИмейл,Дата на съгласие\r\n' + rows.map(row => `${csvCell(row.email)},${csvCell(row.created_at)}`).join('\r\n')
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="quiz-signups.csv"', 'Cache-Control': 'no-store' } })
}
export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Невалидна заявка.' }, { status: 403 })
  const data = z.object({ email: z.string().email().max(254) }).strict().safeParse(await request.json().catch(() => null))
  if (!data.success) return Response.json({ error: 'Невалиден имейл.' }, { status: 400 })
  await sql`delete from store.quiz_email_signups where email = ${data.data.email.toLowerCase()}`
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
