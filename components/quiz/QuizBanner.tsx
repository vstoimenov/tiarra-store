import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import styles from './QuizBanner.module.css'

export function QuizBanner() {
  return <div className={styles.banner}><div><span className={styles.label}><Sparkles size={15} /> ТЕСТ ЗА АРОМАТ</span><h2>Кой аромат е твоят?</h2><p>Отговори на няколко въпроса и открий своите предложения.</p></div><Link href="/aromat-test">Направи теста <ArrowRight size={17} /></Link></div>
}
