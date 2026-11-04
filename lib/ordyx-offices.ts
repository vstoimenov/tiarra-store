import { z } from 'zod'

const officeSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), city: z.string(), postCode: z.string(), address: z.string(), isAutomat: z.boolean() })
export type CourierOffice = z.infer<typeof officeSchema>
export async function getCourierOffices(courier: 'econt' | 'speedy'): Promise<CourierOffice[]> {
  const response = await fetch(`https://app.ordyx.eu/api/offices?courier=${courier}`, {
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('OFFICES_UNAVAILABLE')
  return z.object({ offices: z.array(officeSchema) }).parse(await response.json()).offices
}
