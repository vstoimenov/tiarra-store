'use client'

import { useRef, useState } from 'react'
import type { ProductImage } from '@/lib/catalog/types'
import { imageSrcSet, imageUrl } from '@/lib/images'
import styles from './Gallery.module.css'

interface Props {
  images: ProductImage[]
  /** The picture of the selected variant. It leads the gallery even when it is not one of `images`. */
  selectedPath?: string | null
  /** Alt text for a picture that has none of its own. */
  title: string
}

const MAIN_SIZES = '(min-width: 900px) 560px, calc(100vw - 32px)'
/** A picture outside the gallery has no stored size; the frame is square, so this only fills the attributes. */
const UNKNOWN_SIZE = { width: 1200, height: 1200 }

/**
 * The big picture with thumbnails under it (beside it on a wide screen). Clicking the big picture
 * opens it larger in a dialog. A new `selectedPath` replaces the big picture; a variant without a
 * picture sends none, so whatever is shown stays.
 */
export function Gallery({ images, selectedPath = null, title }: Props) {
  const [shown, setShown] = useState<string | null>(selectedPath ?? images[0]?.path ?? null)
  const [seen, setSeen] = useState(selectedPath)
  const [open, setOpen] = useState(false)
  const zoomRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Adjusting state while rendering (not in an effect) avoids painting the old picture for a frame.
  if (selectedPath !== seen) {
    setSeen(selectedPath)
    setShown(selectedPath ?? images[0]?.path ?? null)
  }

  if (shown === null) {
    return <div className={`${styles.frame} ${styles.empty}`} role="img" aria-label={title} data-testid="no-image" />
  }

  const current = images.find((image) => image.path === shown)
  const size = current ?? UNKNOWN_SIZE
  const alt = current?.alt || title

  function openZoom() {
    setOpen(true)
    dialogRef.current?.showModal()
  }

  function closeZoom() {
    dialogRef.current?.close()
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.inner}>
        <div className={styles.stage}>
          <button
            ref={zoomRef}
            type="button"
            className={styles.zoom}
            aria-label="Увеличи снимката"
            aria-haspopup="dialog"
            onClick={openZoom}
          >
            <img
              data-testid="main-image"
              className={styles.main}
              src={imageUrl(shown, 800)}
              srcSet={imageSrcSet(shown)}
              sizes={MAIN_SIZES}
              width={size.width}
              height={size.height}
              alt={alt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </button>
        </div>

        {images.length > 1 && (
          <ul className={styles.thumbs} data-testid="thumbnails">
            {images.map((image, index) => (
              <li key={image.path}>
                <button
                  type="button"
                  className={styles.thumb}
                  aria-label={`Снимка ${index + 1} от ${images.length}`}
                  aria-current={image.path === shown ? 'true' : undefined}
                  onClick={() => setShown(image.path)}
                >
                  <img
                    src={imageUrl(image.path, 400)}
                    width={80}
                    height={80}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The dialog is always in the page, closed; it has no picture until it is opened, so it costs no download. */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={alt}
        onClose={() => {
          setOpen(false)
          zoomRef.current?.focus()
        }}
        // A click on the backdrop lands on the dialog itself, not on something inside it.
        onClick={(event) => {
          if (event.target === event.currentTarget) closeZoom()
        }}
      >
        {open && <img className={styles.large} src={imageUrl(shown, 1200)} width={size.width} height={size.height} alt={alt} />}
        <button type="button" className={styles.close} aria-label="Затвори" onClick={closeZoom}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </dialog>
    </div>
  )
}
