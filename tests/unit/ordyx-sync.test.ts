import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ tx: vi.fn(), begin: vi.fn(), offices: vi.fn() }))
vi.mock('@/lib/db', () => ({ sql: { begin: mocks.begin } }))
vi.mock('@/lib/ordyx-offices', () => ({ getCourierOffices: mocks.offices }))
import { cancelOrderInOrdyx, syncOrder } from '@/lib/ordyx-sync'

beforeEach(() => {
  vi.stubEnv('ORDYX_API_KEY', 'test-only')
  mocks.tx.mockReset()
  mocks.begin.mockImplementation((callback) => callback(mocks.tx))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('does not send when another worker owns the lock', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: false }])
  expect(await syncOrder('1')).toBe(false)
  expect(fetch).not.toHaveBeenCalled()
})

it('does not send already synced or cancelled orders', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([])
  expect(await syncOrder('1')).toBe(true)
  expect(fetch).not.toHaveBeenCalled()
  expect(mocks.tx.mock.calls[1][0].join('')).toContain("status in ('new', 'confirmed')")
})

it('reuses the external ID and saved address when sending', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: true }])
    .mockResolvedValueOnce([{ id: 'order', order_number: '42', delivery_type: 'address', courier: 'econt', city: 'София', post_code: '1000', delivery_address: 'Тестов адрес', total: 20 }])
    .mockResolvedValueOnce([{ title: 'Продукт', quantity: 1, unit_price: 15.5 }])
    .mockResolvedValueOnce([])
  expect(await syncOrder('42')).toBe(true)
  const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(payload).toMatchObject({ external_id: 'tiarra-42', delivery_type: 'econt_address', city: 'София', post_code: '1000', total: 20 })
})

it('records a failed send for later retry', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: true }])
    .mockResolvedValueOnce([{ id: 'order', order_number: '42', delivery_type: 'address', courier: 'econt', total: 20 }])
    .mockResolvedValueOnce([]).mockResolvedValueOnce([])
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'))
  expect(await syncOrder('42')).toBe(false)
  expect(mocks.tx.mock.calls[3][0].join('')).toContain("ordyx_sync_status = 'failed'")
})

it('cancels a previously synced order with its stable external ID', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: true }])
    .mockResolvedValueOnce([{ id: 'order' }]).mockResolvedValueOnce([])
  expect(await cancelOrderInOrdyx('42')).toBe(true)
  const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(payload).toEqual({ source: 'api', external_id: 'tiarra-42', status: 'cancelled' })
  expect(mocks.tx.mock.calls[2][0].join('')).toContain("ordyx_cancel_status = 'cancelled'")
})

it('does not repeat an Ordyx cancellation that is already complete', async () => {
  mocks.tx.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([])
  expect(await cancelOrderInOrdyx('42')).toBe(true)
  expect(fetch).not.toHaveBeenCalled()
})
