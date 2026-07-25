export function resolveBusinessDocumentPublicUrl(pathOrUrl: string): string {
  const value = pathOrUrl.trim()
  if (/^https?:\/\//i.test(value)) return value

  const configuredApi =
    String(import.meta.env.VITE_API_URL || 'http://localhost:8080/api').trim()
  return new URL(value.startsWith('/') ? value : `/${value}`, configuredApi).toString()
}
