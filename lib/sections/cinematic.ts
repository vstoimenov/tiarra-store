import type { HomeDoc } from './schema'

/** Versioned presentation transform; never writes or replaces a published document. */
export function cinematicHomeV1(home: HomeDoc): HomeDoc {
  if (home.sections.some(s => s.id.endsWith('-story-v1') && s.type === 'productStory')) return home
  const sections: HomeDoc['sections'][number][] = []
  for (const section of home.sections) {
    sections.push(section)
    if (section.type !== 'hero') continue
    sections.push({ id: `${section.id}-story-v1`, type: 'productStory', enabled: section.enabled,
      showFrom: section.showFrom, showUntil: section.showUntil,
      data: { productSlug: '', title: 'Твоят момент за грижа.', text: 'Открий своя следващ любим продукт.', buttonLabel: 'Към продукта' } })
    sections.push({ id: `${section.id}-categories-v1`, type: 'categoryShowcase', enabled: section.enabled,
      showFrom: section.showFrom, showUntil: section.showUntil,
      data: { title: 'Открий своето.', items: [
        { title: 'За нея', href: '/store/category/women' }, { title: 'За него', href: '/store/category/men' },
        { title: 'Парфюми', href: '/store/category/parfimes' }, { title: 'Комплекти', href: '/store/category/komplekt' },
      ] } })
  }
  sections.push({ id: 'cinematic-final-v1', type: 'cinematicFinal', enabled: true,
    data: { title: 'Грижата има личен почерк.', text: 'Открий своя в селекцията на Tiarra Cosmetics.', buttonLabel: 'Разгледай магазина', buttonHref: '/store', productSlug: '' } })
  return {
    sections,
  }
}
