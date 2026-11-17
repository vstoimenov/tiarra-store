import type { Metadata } from 'next'
import { readCommerceSettings } from '@/lib/commerce-settings'
import { CartClient } from '@/components/cart/CartClient'
import styles from '@/components/cart/CartClient.module.css'

export const metadata: Metadata = {
  title: 'Количка | Tiarra Cosmetics',
  robots: { index: false, follow: false },
}

export const dynamic='force-dynamic'

export default async function CartPage() {
  const settings=await readCommerceSettings()
  return (
    <>
      <header className={styles.heading}><h1>Твоята количка</h1></header>
      <CartClient settings={settings}/>
    </>
  )
}
