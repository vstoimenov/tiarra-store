import type { HomeDoc } from './schema'

/** Versioned presentation transform; never writes or replaces a published document. */
export function cinematicHomeV1(home: HomeDoc): HomeDoc {
  if (home.sections.some(s => s.type === 'cinematicHero')) return home
  return {
    sections: [...home.sections.flatMap(s => s.type !== 'hero' ? [s] : [
      { ...s, type: 'cinematicHero' as const, data: {
        title: 'Професионална грижа.', accent: 'Изключително усещане.',
        subtitle: 'Козметика за коса, лице и тяло от Tiarra Cosmetics.',
        buttonLabel: 'Разгледай продуктите', buttonHref: '/store',
        fallbackImagePath: s.data.imagePath, productSlug: '',
      } },
      { id: `${s.id}-story-v1`, type: 'productStory' as const, enabled: s.enabled,
        showFrom: s.showFrom, showUntil: s.showUntil,
        data: { productSlug: '', title: 'Твоят момент за грижа.', text: 'Открий своя следващ любим продукт.', buttonLabel: 'Към продукта' } },
      { id: `${s.id}-categories-v1`, type: 'categoryShowcase' as const, enabled: s.enabled,
        showFrom: s.showFrom, showUntil: s.showUntil,
        data: { title: 'Открий своето.', items: [
          { title: 'За нея', href: '/store/category/women' },
          { title: 'За него', href: '/store/category/men' },
          { title: 'Парфюми', href: '/store/category/parfimes' },
          { title: 'Комплекти', href: '/store/category/komplekt' },
        ] } },
    ]), { id: 'cinematic-final-v1', type: 'cinematicFinal', enabled: true, data: { title: 'Грижата има личен почерк.', text: 'Открий своя в селекцията на Tiarra Cosmetics.', buttonLabel: 'Разгледай магазина', buttonHref: '/store', productSlug: '' } }],
  }
}
