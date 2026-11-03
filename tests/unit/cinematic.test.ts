import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HomeDocSchema } from '@/lib/sections/schema'
import { cinematicHomeV1 } from '@/lib/sections/cinematic'
import { visibleSections } from '@/lib/sections/visible'
const original = HomeDocSchema.parse(JSON.parse(readFileSync(new URL('../../seed/home.json', import.meta.url), 'utf8')))
describe('cinematic document v1', () => {
 it('creates valid typed sections without mutating published data', () => {
  const before = JSON.stringify(original)
  const transformed = cinematicHomeV1(original)
  expect(HomeDocSchema.parse(transformed)).toEqual(transformed)
  expect(JSON.stringify(original)).toBe(before)
  expect(new Set(transformed.sections.map(s => s.id)).size).toBe(transformed.sections.length)
 })
 it('preserves catalog, trust, video, FAQ and campaign sections', () => {
  const result = cinematicHomeV1(original)
  for (const section of original.sections.filter(s => s.type !== 'hero')) expect(result.sections).toContainEqual(section)
 })
 it('is idempotent and inherits visibility windows', () => {
  const scheduled = structuredClone(original)
  Object.assign(scheduled.sections[0], { showFrom: '2099-01-01T00:00:00Z' })
  const result = cinematicHomeV1(scheduled)
  expect(cinematicHomeV1(result)).toBe(result)
  expect(visibleSections(result, new Date('2026-11-03')) .some(s => ['cinematicHero','productStory','categoryShowcase'].includes(s.type))).toBe(false)
 })
})
