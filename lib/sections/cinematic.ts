import type { HomeDoc } from './schema'

/** Versioned presentation transform; never writes or replaces a published document. */
export function cinematicHomeV1(home: HomeDoc): HomeDoc {
  if (home.sections.some(s => s.id.endsWith('-categories-v1') && s.type === 'categoryShowcase')) return home
  const sections: HomeDoc['sections'][number][] = []
  for (const section of home.sections) {
    sections.push(section)
    if (section.type !== 'hero') continue
    sections.push({ id: `${section.id}-categories-v1`, type: 'categoryShowcase', enabled: section.enabled,
      showFrom: section.showFrom, showUntil: section.showUntil,
      data: { title: 'Открий своето.', items: [
        { title: 'За нея', href: '/store/category/women' }, { title: 'За него', href: '/store/category/men' },
        { title: 'Парфюми', href: '/store/category/parfimes' }, { title: 'Комплекти', href: '/store/category/komplekt' },
      ] } })
  }
  return {
    sections,
  }
}
