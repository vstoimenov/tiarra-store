/** Remove inherited lists of other aromas from individually split products.
 * Only recognizes the importer's generated aroma prefix and a paragraph list with one exact
 * match. Unknown or edited formats are left untouched, and the original data is never changed.
 */
export function splitProductDescription(html: string, title: string): string {
  if (!/^\s*<p><strong>Аромат:<\/strong>/i.test(html)) return html
  const parts = title.split(' — ')
  if (parts.length < 2) return html
  const normalize = (value: string) => value.replace(/[’‘]/g, "'").toLocaleLowerCase('bg')
  const name = normalize(parts.at(-1)?.trim() ?? '')
  if (!name) return html
  const heading = /<p>\s*Аромати\s*:\s*<\/p>/i.exec(html)
  if (!heading || heading.index === undefined) return html
  const start = heading.index + heading[0].length
  const remainder = html.slice(start)
  const list: { html: string; text: string }[] = []
  let consumed = 0
  while (true) {
    const match = /^\s*<p>([\s\S]*?)<\/p>/i.exec(remainder.slice(consumed))
    if (!match) break
    const text = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim()
    if (!text) break
    list.push({ html: match[0], text })
    consumed += match[0].length
  }
  if (list.length < 3) return html
  const matching = list.filter(item => {
    const text = normalize(item.text.replace(/^[•\-\s]+/, ''))
    return text.startsWith(name) && /^(?:\s*[-–—:.,]|\s*$)/.test(text.slice(name.length))
  })
  if (matching.length !== 1) return html
  return html.slice(0, heading.index) + '<p><strong>За този аромат</strong></p>' + matching[0].html + remainder.slice(consumed)
}
