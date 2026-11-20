export type MetaContext = { consent: boolean; fbp?: string; fbc?: string }

/** Tracking data is optional: invalid identifiers never invalidate an order. */
export function normalizeMetaContext(value: unknown): MetaContext {
  if (!value || typeof value !== 'object' || !('consent' in value) || value.consent !== true) return { consent: false }
  const row = value as Record<string, unknown>
  const fbp = typeof row.fbp === 'string' && row.fbp.length <= 200 && /^fb\.\d+\.\d{13}\.[0-9]+$/.test(row.fbp) ? row.fbp : undefined
  const fbc = typeof row.fbc === 'string' && row.fbc.length <= 1000 && /^fb\.\d+\.\d{13}\.[A-Za-z0-9_-]+$/.test(row.fbc) ? row.fbc : undefined
  return { consent: true, ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) }
}

export const metaPurchaseEventId = (orderNumber: string) => `order-${orderNumber}`
