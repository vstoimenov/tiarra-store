import { getProductCards } from '@/lib/catalog/queries'
import { sql } from '@/lib/db'
import { HomeDocSchema } from '@/lib/sections/schema'
import { HomeEditor } from '@/components/admin/HomeEditor'
import { effectiveOfferEnd } from '@/lib/countdown'
export const dynamic = 'force-dynamic'
export default async function HomePage() {
  const [row] = await sql`select published,draft,updated_at::text as revision from store.site_documents where key='home'`
  const initial = HomeDocSchema.parse(row?.draft ?? row?.published)
  const document = {...initial, sections: initial.sections.map(section => section.type === 'offer' && section.data.endsAt ? {...section, data: {...section.data, endsAt: effectiveOfferEnd(section.data.endsAt)}} : section)}
  return <HomeEditor products={await getProductCards()} initial={document} initialRevision={row?.revision ?? null} initialHasUnpublished={JSON.stringify(row?.draft ?? row?.published) !== JSON.stringify(row?.published)} />
}
