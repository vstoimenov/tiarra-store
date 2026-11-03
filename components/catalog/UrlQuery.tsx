'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Renders nothing: it tells its parent what `?q=` in the address is, now and whenever it changes.
 * Reading the address is what makes the page wait for the browser, so only this piece does it
 * (inside a <Suspense>) and the cards around it stay in the static HTML.
 */
export function UrlQuery({ onChange }: { onChange: (q: string) => void }) {
  const q = useSearchParams().get('q') ?? ''

  useEffect(() => {
    onChange(q)
  }, [q, onChange])

  return null
}
