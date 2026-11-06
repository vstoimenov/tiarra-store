import { sql } from '@/lib/db'
import { HomeDocSchema } from '@/lib/sections/schema'
import { HomeEditor } from '@/components/admin/HomeEditor'
export const dynamic = 'force-dynamic'
export default async function HomePage() {
  const [row] = await sql`select published,draft,updated_at::text as revision from store.site_documents where key='home'`
  return <HomeEditor initial={HomeDocSchema.parse(row?.draft ?? row?.published)} initialRevision={row?.revision ?? null} />
}
