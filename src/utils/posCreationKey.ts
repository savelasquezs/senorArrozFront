/**
 * Cryptographically random POS submission UUID. Never derive an idempotency key
 * from a timestamp, customer ID or branch; each new draft needs its own key.
 */
export function generatePosCreationKey(): string {
    const cryptoApi = globalThis.crypto
    if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
    if (!cryptoApi?.getRandomValues) {
        throw new Error('No es posible garantizar un envío único en este navegador. Usa una conexión segura.')
    }
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
