import Link from 'next/link'
import { guides,guideSlugs } from '@/lib/geo/guides'
import styles from './Guides.module.css'
export function GuideLinks(){return <section className={styles.links} aria-label="Помощ при избор"><p className={styles.kicker}>ОТГОВОРИ И ПОДБОРКИ</p><h2>Какво търсиш?</h2><div>{guideSlugs.map(slug=><Link key={slug} href={'/saveti/'+slug}>{guides[slug].label}<span aria-hidden="true">↗</span></Link>)}</div></section>}
