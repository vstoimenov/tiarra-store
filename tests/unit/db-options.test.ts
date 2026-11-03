import { describe, expect, it } from 'vitest'
import { connectionOptions, DEFAULT_DB_MAX, IDLE_TIMEOUT_SECONDS, parseDbMax, sslFor } from '@/lib/db-options'

const POOLER = 'postgresql://postgres.abc:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'

describe('sslFor', () => {
  it('stays plain on this machine', () => {
    for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
      expect(sslFor(`postgresql://postgres:postgres@${host}:54322/postgres`)).toBeUndefined()
    }
  })

  it('requires TLS for a hosted database, even when the url says nothing about it', () => {
    expect(sslFor(POOLER)).toBe('require')
    expect(sslFor('postgresql://u:p@db.abc.supabase.co:5432/postgres')).toBe('require')
  })

  it('requires TLS even when the url asks for it to be switched off', () => {
    expect(sslFor(`${POOLER}?sslmode=disable`)).toBe('require')
  })

  it('leaves a stricter mode of the url to the driver instead of weakening it to require', () => {
    expect(sslFor(`${POOLER}?sslmode=verify-full`)).toBeUndefined()
    expect(sslFor(`${POOLER}?sslmode=verify-ca`)).toBeUndefined()
    expect(sslFor(`${POOLER}?sslmode=require`)).toBe('require')
  })

  it('treats a host it cannot read as hosted', () => {
    expect(sslFor('not a url')).toBe('require')
  })
})

describe('parseDbMax', () => {
  it('is 3 when unset or empty', () => {
    expect(DEFAULT_DB_MAX).toBe(3)
    expect(parseDbMax(undefined)).toBe(3)
    expect(parseDbMax('')).toBe(3)
    expect(parseDbMax('  ')).toBe(3)
  })

  it('reads a whole number of 1 or more', () => {
    expect(parseDbMax('1')).toBe(1)
    expect(parseDbMax('5')).toBe(5)
    expect(parseDbMax(' 8 ')).toBe(8)
  })

  it('throws a clear error for anything else', () => {
    for (const bad of ['0', '-2', '2.5', 'abc', '3 connections', '1e1', 'NaN']) {
      expect(() => parseDbMax(bad), bad).toThrow(/DB_MAX/)
    }
    expect(() => parseDbMax('0')).toThrow(/whole number of 1 or more.*"0"/)
  })
})

describe('connectionOptions', () => {
  it('keeps prepared statements off, caps the pool and drops idle connections after 20 s', () => {
    expect(IDLE_TIMEOUT_SECONDS).toBe(20)
    expect(connectionOptions('postgresql://postgres:postgres@127.0.0.1:54322/postgres', '4')).toEqual({
      prepare: false,
      max: 4,
      idle_timeout: 20,
    })
  })

  it('adds ssl for a hosted database only', () => {
    expect(connectionOptions(POOLER, undefined)).toEqual({ prepare: false, max: 3, idle_timeout: 20, ssl: 'require' })
    expect('ssl' in connectionOptions('postgresql://u:p@localhost:5432/postgres', undefined)).toBe(false)
  })

  it('fails on a bad DB_MAX', () => {
    expect(() => connectionOptions(POOLER, '0')).toThrow(/DB_MAX/)
  })
})
