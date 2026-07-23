/** Fügt Klassennamen zusammen und wirft falsche Werte weg. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** "12" -> "12", 0 -> "0"; formatiert Zahlen mit deutschem Tausendertrennzeichen. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Pluralisierung für deutsche UI-Texte: plural(1, 'Thema', 'Themen') -> "1 Thema". */
export function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`
}
