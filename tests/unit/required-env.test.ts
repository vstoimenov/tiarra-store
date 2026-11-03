import { describe, expect, it } from 'vitest'
import { assertRequiredEnv, REQUIRED_ENV } from '@/lib/site/required-env'

const complete = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  DATABASE_URL: 'postgresql://u:p@host:6543/postgres',
  SITE_URL: 'https://tiarracosmetics.com',
}

describe('assertRequiredEnv', () => {
  it('names the three variables a hosted build cannot do without', () => {
    expect([...REQUIRED_ENV].sort()).toEqual(['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SITE_URL'])
  })

  it('passes in production and preview when all three are set', () => {
    expect(() => assertRequiredEnv({ ...complete, SITE_ENV: 'production' })).not.toThrow()
    expect(() => assertRequiredEnv({ ...complete, SITE_ENV: 'preview' })).not.toThrow()
  })

  it('throws in production and preview, listing every missing variable', () => {
    for (const SITE_ENV of ['production', 'preview']) {
      expect(() => assertRequiredEnv({ SITE_ENV }), SITE_ENV).toThrow(
        /NEXT_PUBLIC_SUPABASE_URL, DATABASE_URL, SITE_URL/,
      )
    }
  })

  it('names the environment and only what is missing', () => {
    const call = () => assertRequiredEnv({ ...complete, NEXT_PUBLIC_SUPABASE_URL: undefined, SITE_ENV: 'preview' })

    expect(call).toThrow(/"preview"/)
    expect(call).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(call).not.toThrow(/DATABASE_URL|SITE_URL/)
  })

  it('counts an empty or blank value as missing', () => {
    expect(() => assertRequiredEnv({ ...complete, SITE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: '' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    )
    expect(() => assertRequiredEnv({ ...complete, SITE_ENV: 'production', DATABASE_URL: '  ' })).toThrow(/DATABASE_URL/)
  })

  it('checks nothing in development or when SITE_ENV is not set', () => {
    expect(() => assertRequiredEnv({ SITE_ENV: 'development' })).not.toThrow()
    expect(() => assertRequiredEnv({})).not.toThrow()
  })
})
