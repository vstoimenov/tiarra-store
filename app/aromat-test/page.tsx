import { PerfumeQuiz } from '@/components/quiz/PerfumeQuiz'
import { getPerfumeQuizProducts } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'

export const dynamic = 'force-dynamic'
export const metadata = pageMetadata({ title: 'Открий своя аромат | Tiarra Cosmetics', description: 'Открий парфюм според предпочитаните ароматни нотки.', path: '/aromat-test' })

export default async function PerfumeQuizPage() {
  const products = await getPerfumeQuizProducts()
  return <PerfumeQuiz products={products} />
}
