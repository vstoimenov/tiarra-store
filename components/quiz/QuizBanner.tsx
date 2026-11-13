import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import styles from './QuizBanner.module.css'

export function QuizBanner() {
  return <div className={styles.banner}><div><span className={styles.label}><Sparkles size={15} /> ТЕСТ ЗА АРОМАТ</span><h2>Не знаеш кой аромат да избереш?</h2><p>Няколко въпроса ще те насочат към подходящите за теб парфюми.</p></div><Link href="/aromat-test">Открий своя аромат за под 60 секунди <ArrowRight size={17} /></Link></div>
}
