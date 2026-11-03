import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { ContentPage } from '@/components/content/ContentPage'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getPage } from '@/lib/site/pages'

const loadPage = cache(() => getPage('za-nas'))

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPage()
  if (!page) return {}

  return pageMetadata({
    title: `${page.title} | Tiarra Cosmetics`,
    description: page.seoDescription,
    path: '/promo/za-nas',
  })
}

export default async function AboutPage() {
  const page = await loadPage()
  if (!page) notFound()

  return <ContentPage title={page.title} html={page.bodyHtml} />
}
