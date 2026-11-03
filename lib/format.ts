const euro = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** `29,90 €`: bg-BG decimals, two of them, and a plain space before the euro sign. */
export function formatPrice(n: number): string {
  // Intl puts a no-break space (or none) around the number; a plain space keeps the text easy to match and copy.
  return `${euro.format(n).replace(/ /g, ' ')} €`
}

/** The saving as a whole percent of the old price. */
export function discountPercent(compareAt: number, price: number): number {
  return Math.round(((compareAt - price) / compareAt) * 100)
}

/** An old price is only worth showing when it is above the price (ruling R7), not merely present. */
export function isDiscounted(price: number, compareAt: number | null): compareAt is number {
  return compareAt !== null && compareAt > price
}
