import type { Perfume } from '@/lib/catalog/types'
import styles from './PerfumePyramid.module.css'

// Port of tiarra-sections/07-product-perfume.html. The notes come from the product's `perfume`
// field (filled at import from the description); the block shows only when at least two of the
// three are there.

const GOLD = '#E5A72E'
const DARK = '#2E2720'

type Note = 'top' | 'heart' | 'base'

const NOTES: { key: Note; name: string; hint: string }[] = [
  { key: 'top', name: 'Връхни нотки', hint: 'Първо впечатление' },
  { key: 'heart', name: 'Средни нотки', hint: 'Сърцето на аромата' },
  { key: 'base', name: 'Базови нотки', hint: 'Шлейфът, който остава' },
]

const BANDS = ['28,2 36.86,17 19.14,17', '19.14,17 36.86,17 45.14,31 10.86,31', '10.86,31 45.14,31 54,46 2,46']

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

const Clock = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
const Bottle = () => (
  <svg {...iconProps}>
    <rect x="10" y="2.5" width="4" height="3" rx=".6" />
    <path d="M9.5 5.5h5v2.2a4.5 4.5 0 0 1 3 4.2V20a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20v-8.1a4.5 4.5 0 0 1 3-4.2z" />
  </svg>
)
const Gift = () => (
  <svg {...iconProps}>
    <rect x="3" y="8" width="18" height="4" />
    <path d="M5 12v9h14v-9" />
    <path d="M12 8v13" />
    <path d="M12 8c-2.5 0-4.5-1.1-4.5-2.9C7.5 3.9 8.6 3 9.8 3c1.6 0 2.2 2 2.2 5zm0 0c2.5 0 4.5-1.1 4.5-2.9C16.5 3.9 15.4 3 14.2 3c-1.6 0-2.2 2-2.2 5z" />
  </svg>
)
const Shield = () => (
  <svg {...iconProps}>
    <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

/** A triangle in three bands; the band of the note is gold. */
function Triangle({ active }: { active: number }) {
  return (
    <svg className={styles.tri} viewBox="0 0 56 48" aria-hidden="true">
      {BANDS.map((points, i) => (
        <polygon key={points} points={points} fill={i === active ? GOLD : DARK} />
      ))}
      <polygon points="28,2 54,46 2,46" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="19.14" y1="17" x2="36.86" y2="17" stroke={GOLD} strokeWidth="1" />
      <line x1="10.86" y1="31" x2="45.14" y2="31" stroke={GOLD} strokeWidth="1" />
    </svg>
  )
}

/** The notes the product has, or `null` when fewer than two of the three are given. */
export function pyramidNotes(perfume: Perfume | null): { note: (typeof NOTES)[number]; text: string }[] | null {
  if (!perfume) return null
  const given = NOTES.flatMap((note) => (perfume[note.key] ? [{ note, text: perfume[note.key]! }] : []))
  return given.length >= 2 ? given : null
}

export function PerfumePyramid({ perfume }: { perfume: Perfume | null }) {
  const given = pyramidNotes(perfume)
  if (!perfume || !given) return null

  const features = [
    { icon: <Clock />, text: 'Дълготраен аромат' },
    ...(perfume.volume ? [{ icon: <Bottle />, text: `Флакон ${perfume.volume}` }] : []),
    { icon: <Gift />, text: 'Подходящ за подарък' },
    { icon: <Shield />, text: '100% оригинален' },
  ]

  return (
    <section className={styles.block} aria-label="Ароматна пирамида">
      <ul className={styles.feats} style={{ gridTemplateColumns: `repeat(${features.length}, 1fr)` }}>
        {features.map((feature) => (
          <li key={feature.text} className={styles.feat}>
            {feature.icon}
            <span>{feature.text}</span>
          </li>
        ))}
      </ul>

      <div className={styles.pyramid}>
        <p className={styles.kicker}>Ароматна пирамида</p>
        <h2 className={styles.title}>{perfume.aroma ? `Как ухае ${perfume.aroma}` : 'Как ухае този аромат'}</h2>
        {given.map(({ note, text }) => (
          <div key={note.key} className={styles.note}>
            <Triangle active={NOTES.indexOf(note)} />
            <div>
              <h3 className={styles.noteName}>{note.name}</h3>
              <p className={styles.noteHint}>{note.hint}</p>
              <p className={styles.noteText}>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
