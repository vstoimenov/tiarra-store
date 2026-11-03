import { formatPrice } from '@/lib/format'
import styles from './TrustBlock.module.css'

// Port of tiarra-sections/05-product-trust.html. The two thresholds come from the settings
// document, so a change there reaches every product page.

interface Props {
  /** Orders above this (in €) ship free. */
  freeShippingThreshold: number
  /** Orders above this (in €) get the sample gift. */
  giftThreshold: number
}

/** „20 €“ for a whole number, „19,90 €“ otherwise: how the copy writes a limit. */
function limit(amount: number): string {
  return Number.isInteger(amount) ? `${amount} €` : formatPrice(amount)
}

const strokeIcon = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function TrustBlock({ freeShippingThreshold, giftThreshold }: Props) {
  return (
    <section className={styles.trust} data-testid="trust" aria-label="Гаранции">
      <div className={styles.row}>
        <div className={`${styles.icon} ${styles.gift}`}>
          <svg {...strokeIcon}>
            <rect x="3" y="8" width="18" height="4" />
            <path d="M5 12v9h14v-9" />
            <path d="M12 8v13" />
            <path d="M12 8c-2.5 0-4.5-1.1-4.5-2.9C7.5 3.9 8.6 3 9.8 3c1.6 0 2.2 2 2.2 5zm0 0c2.5 0 4.5-1.1 4.5-2.9C16.5 3.9 15.4 3 14.2 3c-1.6 0-2.2 2-2.2 5z" />
          </svg>
        </div>
        <div>
          <b className={styles.head}>Подарък: мостри от нашите продукти</b>
          <span className={styles.text}>Към всяка поръчка над {limit(giftThreshold)} — изненада в пратката.</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.icon}>
          <svg {...strokeIcon}>
            <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
            <circle cx="7" cy="19" r="1.8" />
            <circle cx="17" cy="19" r="1.8" />
          </svg>
        </div>
        <div>
          <b className={styles.head}>Доставка 1–2 работни дни</b>
          <span className={styles.text}>
            Изпращаме до 24 часа с Еконт или Спиди. Безплатна доставка над {limit(freeShippingThreshold)}.
          </span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.icon}>
          <svg {...strokeIcon}>
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5" />
            <path d="M12 13v8" />
          </svg>
        </div>
        <div>
          <b className={styles.head}>Преглед преди плащане</b>
          <span className={styles.text}>Отваряш пратката пред куриера и плащаш чак след това.</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.icon}>
          <svg {...strokeIcon}>
            <path d="M3 12a9 9 0 109-9" />
            <path d="M3 4v5h5" />
            <path d="M12 8v4l3 2" />
          </svg>
        </div>
        <div>
          <b className={styles.head}>14 дни право на връщане</b>
          <span className={styles.text}>Неразпечатан продукт връщаш без въпроси и без усложнения.</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.icon}>
          <svg {...strokeIcon}>
            <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <b className={styles.head}>100% оригинален продукт</b>
          <span className={styles.text}>Внос от официалната дистрибуторска мрежа на производителя.</span>
        </div>
      </div>

      <div className={styles.pay}>
        <small className={styles.payLabel}>Плащане:</small>
        <span className={styles.card} role="img" aria-label="Visa">
          <svg viewBox="0 0 52 16" aria-hidden="true">
            <text
              x="26"
              y="14"
              textAnchor="middle"
              fontFamily="Arial Black, Arial, Helvetica, sans-serif"
              fontWeight="900"
              fontStyle="italic"
              fontSize="16"
              fill="#1A1F71"
              letterSpacing=".5"
            >
              VISA
            </text>
          </svg>
        </span>
        <span className={`${styles.card} ${styles.mastercard}`} role="img" aria-label="Mastercard">
          <svg viewBox="0 0 42 26" aria-hidden="true">
            <circle cx="15" cy="13" r="9" fill="#EB001B" />
            <circle cx="27" cy="13" r="9" fill="#F79E1B" />
            <path d="M21 6.29A9 9 0 0 1 21 19.71A9 9 0 0 1 21 6.29Z" fill="#FF5F00" />
          </svg>
        </span>
        <span className={`${styles.card} ${styles.cod}`}>НАЛОЖЕН ПЛАТЕЖ</span>
      </div>
    </section>
  )
}
