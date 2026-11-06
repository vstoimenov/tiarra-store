import { SettingsAdmin } from '@/components/admin/SettingsAdmin'
import { readCommerceSettings } from '@/lib/commerce-settings'
import styles from './page.module.css'
export const dynamic='force-dynamic'
export const metadata={title:'Настройки | Tiarra Admin'}
export default async function SettingsPage(){
 const stored=await readCommerceSettings()
 const settings={...stored,googleAnalyticsId:stored.googleAnalyticsId??process.env.NEXT_PUBLIC_GA_ID??null,googleTagManagerId:stored.googleTagManagerId??process.env.NEXT_PUBLIC_GTM_ID??null,metaPixelId:stored.metaPixelId??process.env.NEXT_PUBLIC_META_PIXEL_ID??null}
 const connections={ordyx:Boolean(process.env.ORDYX_API_KEY),storage:Boolean(process.env.SUPABASE_SECRET_KEY),stripe:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY&&process.env.STRIPE_WEBHOOK_SECRET)}
 return <main className={styles.page}><header><span>КОНТРОЛЕН ЦЕНТЪР</span><h1>Настройки</h1><p>Интеграции, плащания и доставки в един ясен екран.</p></header><SettingsAdmin initial={settings} connections={connections}/></main>
}
