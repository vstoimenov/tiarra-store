import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { ContentPage } from '@/components/content/ContentPage'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getPage, LEGAL_PAGE_SLUGS } from '@/lib/site/pages'

// Only the five legal pages are built; any other address is a 404 and never reaches the database.
export const dynamicParams = false

export function generateStaticParams() {
  return LEGAL_PAGE_SLUGS.map((page) => ({ page }))
}

// Metadata and page both need the row; `cache` makes that one query per render.
const loadPage = cache(getPage)

type Params = { params: Promise<{ page: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page: slug } = await params
  const page = await loadPage(slug)
  if (!page) return {}

  return pageMetadata({
    title: `${page.title} | Tiarra Cosmetics`,
    description: page.seoDescription,
    path: `/${encodeURIComponent(slug)}`,
  })
}

export default async function LegalPage({ params }: Params) {
  const page = await loadPage((await params).page)
  if (!page) notFound()

  return <ContentPage title={page.title} html={page.bodyHtml} />
}
