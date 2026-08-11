import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DELIVERY_APP_PLAY_STORE_URL } from '@/constants/deliveryApp'

describe('delivery app distribution link', () => {
  it('uses Google Play without a downloadable binary', () => {
    const loginSource = readFileSync(resolve(process.cwd(), 'src/views/Login.vue'), 'utf8')
    const deliverySource = readFileSync(resolve(process.cwd(), 'src/views/DeliveryView.vue'), 'utf8')

    expect(DELIVERY_APP_PLAY_STORE_URL).toBe(
      'https://play.google.com/store/apps/details?id=com.senorarroz.delivery_app',
    )
    expect(loginSource).toContain(':href="DELIVERY_APP_PLAY_STORE_URL"')
    expect(deliverySource).toContain(':href="DELIVERY_APP_PLAY_STORE_URL"')
    expect(`${loginSource}\n${deliverySource}`).not.toContain('.apk')
    expect(`${loginSource}\n${deliverySource}`).not.toContain(' download')
  })
})
