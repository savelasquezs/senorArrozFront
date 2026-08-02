export function isLikelyPhoneNumber(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || !/^\+?[\d\s().-]+$/.test(trimmed)) return false

  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('57'))
}

export function normalizePhoneForSearch(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('57')
    ? digits.slice(2)
    : digits
}
