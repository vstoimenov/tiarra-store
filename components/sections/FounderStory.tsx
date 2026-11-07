'use client'

import { useId, useState } from 'react'
import styles from './ImageText.module.css'

export function FounderStory({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return <>
    <div id={id} className={`${styles.body} ${expanded ? '' : styles.collapsed}`} dangerouslySetInnerHTML={{ __html: html }} />
    <button type="button" className={styles.readMore} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      {expanded ? 'Покажи по-малко' : 'Научи повече'} <span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </button>
  </>
}
