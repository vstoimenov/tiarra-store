import type { HomeDoc } from './schema'

/** Versioned presentation transform; never writes or replaces a published document. */
export function cinematicHomeV1(home: HomeDoc): HomeDoc {
  if (!home.sections.some((section) => section.type === 'categoryShowcase')) return home
  return { sections: home.sections.filter((section) => section.type !== 'categoryShowcase') }
}
