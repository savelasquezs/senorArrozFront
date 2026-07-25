import { describe, expect, it } from 'vitest'
import { resolveBusinessDocumentPublicUrl } from '@/utils/businessDocumentUrl'

describe('resolveBusinessDocumentPublicUrl', () => {
  it('conserva enlaces HTTPS absolutos', () => {
    expect(
      resolveBusinessDocumentPublicUrl('https://api.example.com/api/public/business-documents/id/download'),
    ).toBe('https://api.example.com/api/public/business-documents/id/download')
  })

  it('convierte la ruta pública del API en una URL absoluta', () => {
    const result = resolveBusinessDocumentPublicUrl(
      '/api/public/business-documents/123/download',
    )

    expect(new URL(result).pathname).toBe(
      '/api/public/business-documents/123/download',
    )
  })
})
