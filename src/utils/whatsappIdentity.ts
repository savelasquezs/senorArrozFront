export function normalizeWhatsAppUsername(value?: string | null): string {
  const handle = (value ?? '').trim().toLowerCase().replace(/^@+/, '')
  return handle ? `@${handle}` : ''
}

export function matchesWhatsAppUsername(username: string | null | undefined, query: string): boolean {
  const normalizedUsername = normalizeWhatsAppUsername(username)
  const normalizedQuery = normalizeWhatsAppUsername(query)
  return !!normalizedUsername && !!normalizedQuery && normalizedUsername.includes(normalizedQuery)
}
