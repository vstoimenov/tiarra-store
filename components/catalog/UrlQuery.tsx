'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import type { Gender } from '@/lib/catalog/types'

/**
 * Renders nothing: it tells its parent what `?q=` in the address is, now and whenever it changes.
 * Reading the address is what makes the page wait for the browser, so only this piece does it
 * (inside a <Suspense>) and the cards around it stay in the static HTML.
 */
export function UrlQuery({ onChange }: { onChange: (q: string, gender: Gender | undefined) => void }) {
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const value = params.get('gender')
  const gender = value === 'male' || value === 'female' || value === 'unisex' ? value : undefined

  useEffect(() => {
    onChange(q, gender)
  }, [q, gender, onChange])

  return null
}
