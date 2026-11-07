import { cinematicHomeV1 } from '@/lib/sections/cinematic'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { getProductCards } from '@/lib/catalog/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { visibleSections } from '@/lib/sections/visible'
import { getSiteDocument } from '@/lib/site/documents'
import { brandsOf } from '@/lib/catalog/filter'
import styles from './brands.module.css'
import Link from 'next/link'

const brandLogos:Record<string,string>={'AMERICAN CREW':'american-crew','DEPOT':'depot','GILLETTE':'gillette','NISH LADY':'nish-lady','NISH MAN':'nish-man','REDONE':'redone','REUZEL':'reuzel','STMNT':'stmnt','YODEYMA':'yodeyma'}

export const metadata = pageMetadata({
  title: 'Tiarra Cosmetics | Професионална козметика за коса, лице и тяло',
  description:
    'Онлайн магазин за професионална козметика за коса, лице и тяло в България. 100% оригинални продукти и безплатна доставка над 39 €.',
  path: '/',
})

// The page is static, rebuilt at most every 5 minutes. That is how a campaign section with a
// `showFrom` / `showUntil` appears and disappears without a deploy.
export const revalidate = 300

export default async function HomePage() {
  // One catalog query for the whole page: every products section picks its cards from it.
  const [home, settings, cards] = await Promise.all([
    getSiteDocument('home'),
    getSiteDocument('settings'),
    getProductCards(),
  ])
  const brands=brandsOf(cards)
  const brandRows=Array.from({length:Math.ceil(brands.length/4)},(_,index)=>brands.slice(index*4,index*4+4))

  return <><SectionRenderer
    sections={visibleSections(process.env.CINEMATIC_HOME === '1' ? cinematicHomeV1(home) : home, new Date())}
    cards={cards}
    settings={settings}
  />{brands.length>0&&<section className={styles.brands} aria-labelledby="brands-title"><div className={styles.inner}><header className={styles.heading}><div><p>СЕЛЕКЦИЯТА НА TIARRA</p><h2 id="brands-title">Брандове с присъствие.</h2></div><span>{brands.length} марки · една селекция</span></header><div className={styles.grid}>{brandRows.map((row,index)=><div className={styles.row} key={index}>{row.map(brand=><Link href={`/store?q=${encodeURIComponent(brand)}`} key={brand} className={styles.cell}>{brandLogos[brand.toUpperCase()]?<img className={styles.logo} src={`/brands/${brandLogos[brand.toUpperCase()]}.webp`} alt={brand} width={180} height={80} loading="lazy" decoding="async"/>:<span className={styles.wordmark}>{brand}</span>}<span className={styles.arrow} aria-hidden="true">↗</span></Link>)}</div>)}</div><div className={styles.bottom}><span>Открий своята грижа.</span><Link href="/store">Разгледай селекцията ↗</Link></div></div></section>}</>
}
