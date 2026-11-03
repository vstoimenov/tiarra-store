/** Stock `null` means the item is not tracked, so it is always available. */
export function isAvailable(stock: number | null): boolean {
  return stock === null || stock > 0
}
