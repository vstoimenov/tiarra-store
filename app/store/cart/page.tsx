import type { Metadata } from 'next'
import { CartClient } from '@/components/cart/CartClient'
import styles from '@/components/cart/CartClient.module.css'

export const metadata: Metadata = {
  title: 'Количка | Tiarra Cosmetics',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <>
      <header className={styles.heading}><h1>Твоята количка</h1></header>
      <CartClient />
    </>
  )
}
