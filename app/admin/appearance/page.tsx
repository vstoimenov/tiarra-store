import { ThemeStudio } from '@/components/admin/ThemeStudio'
import { readSiteDocument } from '@/lib/site/documents'

export const metadata = { title: 'Визия на магазина | Tiarra Admin' }
export const dynamic = 'force-dynamic'

export default async function AppearancePage() {
  const home = await readSiteDocument('home')
  return <ThemeStudio initialTheme={home.theme} />
}
