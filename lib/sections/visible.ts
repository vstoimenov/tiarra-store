import type { HomeDoc, Section } from './schema'

/**
 * The sections to render at `now`, in document order. A section shows while it is enabled and
 * `showFrom <= now < showUntil`; a missing bound always passes. Callers pass `now` so a page
 * that revalidates (`/` every 5 minutes) drops an expired campaign without a deploy.
 */
export function visibleSections(doc: Pick<HomeDoc, 'sections'>, now: Date): Section[] {
  const t = now.getTime()
  return doc.sections.filter(
    (s) =>
      s.enabled &&
      (s.showFrom === undefined || Date.parse(s.showFrom) <= t) &&
      (s.showUntil === undefined || t < Date.parse(s.showUntil)),
  )
}
