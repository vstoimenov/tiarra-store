'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CART_UPDATED_EVENT, cartQuantity, readCart } from '@/lib/cart'
import { CartClient } from './CartClient'
import styles from './CartDrawer.module.css'
import { BagIcon } from '@/components/layout/icons'

export function CartLink({ className, textClassName, badgeClassName }: { className: string; textClassName: string; badgeClassName: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {document.body.style.overflow = previous}
  }, [open])
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
    <><Link onClick={event => {if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;event.preventDefault();setOpen(true);dialog.current?.showModal()}} href="/store/cart" className={className} aria-label={`Количка, ${quantity} продукта`}>
      <BagIcon />
      <span className={textClassName}>Количка</span>
      {quantity > 0 && <span className={badgeClassName}>{quantity > 99 ? '99+' : quantity}</span>}
    </Link><dialog ref={dialog} className={styles.drawer} aria-labelledby="cart-drawer-title" onClose={() => setOpen(false)} onClick={e => {if(e.target === e.currentTarget) dialog.current?.close()}}><div className={styles.content}><header><h2 id="cart-drawer-title">Твоята количка</h2><button type="button" aria-label="Затвори количката" onClick={() => dialog.current?.close()}>×</button></header><div onClick={e => {if((e.target as HTMLElement).closest('a')) dialog.current?.close()}}>{open && <CartClient compact />}</div></div></dialog></>
  )
}
