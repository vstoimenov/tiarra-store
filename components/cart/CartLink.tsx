'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CART_UPDATED_EVENT, cartQuantity, readCart } from '@/lib/cart'
import { BagIcon } from '@/components/layout/icons'

export function CartLink({ className, textClassName, badgeClassName }: { className: string; textClassName: string; badgeClassName: string }) {
  const [quantity, setQuantity] = useState(0)

  useEffect(() => {
    const update = () => setQuantity(cartQuantity(readCart()))
    update()
    window.addEventListener(CART_UPDATED_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <Link href="/store/cart" className={className} aria-label={`Количка, ${quantity} продукта`}>
      <BagIcon />
      <span className={textClassName}>Количка</span>
      {quantity > 0 && <span className={badgeClassName}>{quantity > 99 ? '99+' : quantity}</span>}
    </Link>
  )
}
