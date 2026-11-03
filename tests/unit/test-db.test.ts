import { describe, expect, it } from 'vitest'
import { assertTestDatabase, testDatabaseUrl } from '@/tests/integration/test-db'

describe('testDatabaseUrl', () => {
  it('points the dev connection at tiarra_test and keeps credentials, host and port', () => {
    expect(testDatabaseUrl('postgresql://postgres:secret@127.0.0.1:54322/postgres')).toBe(
      'postgresql://postgres:secret@127.0.0.1:54322/tiarra_test',
    )
  })

  it('falls back to the default local Supabase connection', () => {
    expect(testDatabaseUrl(undefined)).toBe('postgresql://postgres:postgres@127.0.0.1:54322/tiarra_test')
  })
})

describe('assertTestDatabase', () => {
  it('accepts tiarra_test on a local host', () => {
    expect(() => assertTestDatabase('postgresql://postgres:x@127.0.0.1:54322/tiarra_test')).not.toThrow()
    expect(() => assertTestDatabase('postgresql://postgres:x@localhost:54322/tiarra_test')).not.toThrow()
  })

  it('refuses the dev database', () => {
    expect(() => assertTestDatabase('postgresql://postgres:x@127.0.0.1:54322/postgres')).toThrow(/tiarra_test/)
  })

  it('refuses a remote host even when the database is called tiarra_test', () => {
    expect(() => assertTestDatabase('postgresql://postgres:x@db.example.supabase.co:5432/tiarra_test')).toThrow(
      /127\.0\.0\.1/,
    )
  })

  it('refuses a url whose query string could override the host', () => {
    expect(() =>
      assertTestDatabase('postgresql://postgres:x@127.0.0.1:54322/tiarra_test?host=db.example.supabase.co'),
    ).toThrow()
  })

  it('refuses a missing or unparsable url', () => {
    expect(() => assertTestDatabase(undefined)).toThrow()
    expect(() => assertTestDatabase('not a url')).toThrow()
  })
})
