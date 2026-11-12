/** Next can supply percent-encoded route parameters for dynamically added products. */
export function decodeProductSlug(slug: string): string {
  try { return decodeURIComponent(slug) } catch { return slug }
}
