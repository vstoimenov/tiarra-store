import type postgres from 'postgres'

/**
 * Counting semaphore. A released slot goes straight to the oldest waiter (the count does not
 * dip), so a caller arriving right after a release cannot jump the queue or exceed `max`.
 */
export function createSlots(max: number) {
  let active = 0
  const waiting: Array<() => void> = []

  return {
    acquire(): Promise<void> {
      if (active < max) {
        active++
        return Promise.resolve()
      }
      return new Promise((resolve) => waiting.push(resolve))
    },
    release(): void {
      const next = waiting.shift()
      if (next) next()
      else active--
    },
  }
}

type QueryHandler = ((query: unknown) => void) & { debug?: unknown }
type PendingQuery = Promise<unknown> & { handler: QueryHandler }
type AnyFunction = (...args: unknown[]) => unknown

/**
 * Makes a postgres.js client run at most `max` queries (or transactions) at a time; the rest
 * wait for a free connection. postgres.js pipelines extra queries onto busy connections and the
 * Supabase transaction pooler sometimes never answers those (or answers the wrong one), so each
 * query must have a connection to itself. `max_pipeline` cannot do this: 1 still pipelines one
 * extra query and 0 breaks `sql.begin`. Pass the client's own `max` here.
 *
 * Covers sql`...`, sql.unsafe, sql.file and sql.begin. Inside `sql.begin` use the `tx` handle,
 * never the outer client (that would wait for a slot the transaction itself is holding).
 */
export function limitInFlight(client: postgres.Sql, max: number): postgres.Sql {
  const slots = createSlots(max)

  // postgres.js runs a query when it is first awaited, by calling query.handler(query).
  // Hold that call until a slot is free and give the slot back when the query settles.
  // Fragments (sql`...` nested in another query) are never awaited, so they never take a slot.
  function gate(query: PendingQuery): PendingQuery {
    const start = query.handler
    const gated: QueryHandler = (q) => {
      void slots.acquire().then(() => {
        // Base `then`: awaiting `query` itself would re-trigger it.
        Promise.prototype.then.call(query, slots.release, slots.release)
        start(q)
      })
    }
    gated.debug = start.debug
    query.handler = gated
    return query
  }

  return new Proxy(client, {
    apply(target, thisArg, args) {
      const result = Reflect.apply(target, thisArg, args)
      return result instanceof Promise ? gate(result as PendingQuery) : result
    },
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      if (prop === 'begin') {
        return (...args: unknown[]) =>
          slots.acquire().then(() => (value as AnyFunction)(...args)).finally(slots.release)
      }
      if (prop === 'unsafe' || prop === 'file') {
        return (...args: unknown[]) => gate((value as AnyFunction)(...args) as PendingQuery)
      }
      return value
    },
  })
}
