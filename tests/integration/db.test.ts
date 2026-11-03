import { afterAll, describe, expect, it } from 'vitest'
import { sql } from '@/lib/db'

afterAll(() => sql.end())

interface Write {
  connection: number
  text: string
  at: number
}

/** Records every statement written to a connection while `run` executes. */
async function recordWrites(run: () => Promise<unknown>): Promise<Write[]> {
  const writes: Write[] = []
  sql.options.debug = (connection: number, text: string) => {
    writes.push({ connection, text, at: performance.now() })
  }
  try {
    await run()
  } finally {
    sql.options.debug = false
  }
  return writes
}

/**
 * The longest a statement waited behind a still-running pg_sleep on the same connection.
 * A statement pipelined onto a busy connection is written at once (gap ~0 ms); a queued one
 * is written after the previous answer (gap >= the 50 ms sleep).
 */
function smallestGapAfterSleep(writes: Write[]): number {
  const gaps: number[] = []
  const lastWrite = new Map<number, Write>()
  for (const write of writes) {
    const previous = lastWrite.get(write.connection)
    if (previous?.text.includes('pg_sleep')) gaps.push(write.at - previous.at)
    lastWrite.set(write.connection, write)
  }
  return Math.min(...gaps)
}

describe('database client', () => {
  it('never writes a query to a connection that is still running another', async () => {
    const writes = await recordWrites(() =>
      Promise.all([
        ...Array.from({ length: 12 }, () => sql`select pg_sleep(0.05)`),
        ...Array.from({ length: 4 }, () =>
          sql.begin(async (tx) => {
            await tx`select pg_sleep(0.05)`
            await tx`select 1`
          }),
        ),
      ]),
    )

    expect(new Set(writes.map((w) => w.connection)).size).toBeLessThanOrEqual(sql.options.max)
    expect(smallestGapAfterSleep(writes)).toBeGreaterThanOrEqual(40)
  })

  it('still completes more concurrent transactions than there are connections', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        sql.begin(async (tx) => {
          await tx`select ${i}::int as first`
          const [row] = await tx<{ second: number }[]>`select ${i * 2}::int as second`
          return row.second
        }),
      ),
    )

    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14])
  })

  it('keeps fragments usable inside a gated query', async () => {
    const filter = sql`where n > ${1}`
    const rows = await sql<{ n: number }[]>`select n from (values (1), (2), (3)) as t(n) ${filter} order by n`

    expect(rows.map((r) => r.n)).toEqual([2, 3])
  })
})
