import { z } from 'zod'

const link = z.object({ label: z.string().min(1), href: z.string().min(1) })
const price = z.number().nonnegative()

export const SettingsSchema = z.object({
  /** The short brand paragraph at the top of the footer. */
  footerText: z.string().optional(),
  /** Messages the top bar rotates through. */
  topbarMessages: z.array(z.string().min(1)),
  /** Orders above this (in €) ship free. */
  freeShippingThreshold: price,
  /** Orders above this (in €) get the sample gift. */
  giftThreshold: price,
  /** Courier office delivery price in €. */
  shipping: z.object({ econtOffice: price, speedyOffice: price }),
  company: z.object({
    legalName: z.string().min(1),
    eik: z.string().min(1),
    city: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().min(1),
  }),
  social: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
  }),
})

export const NavigationSchema = z.object({
  menu: z.array(link),
  footer: z.array(z.object({ title: z.string().min(1), links: z.array(link) })),
})

export type Settings = z.infer<typeof SettingsSchema>
export type Navigation = z.infer<typeof NavigationSchema>
