import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DeliveryTimeBreakdown from '../DeliveryTimeBreakdown.vue'
import type { DeliveryPerformanceSummary } from '@/types/deliveryPerformance'

const sample = (count: number, dispatch: number | null, delivery: number | null, back: number | null) => ({ stageSampleCount: count, avgDispatchMinutes: dispatch, avgDeliveryStageMinutes: delivery, avgReturnMinutes: back } as DeliveryPerformanceSummary)

describe('route time breakdown', () => {
  it('presents all valid departures as real route stages', () => {
    const data = { ...sample(4, 5, 20, 10), inconsistentReturnCount: 2 }
    const wrapper = mount(DeliveryTimeBreakdown, { props: { summary: data, comparison: false,
      rows: [{ label: 'lunes, 5 oct', data: { ...data, stageSampleCount: 3 } }, { label: 'jueves, 22 oct', data: sample(1, 5, 20, 10) }] } })
    expect(wrapper.text()).toContain('4 rutas con etapas válidas')
    expect(wrapper.text()).toContain('2 regresos inconsistentes excluidos de los promedios de tiempo.')
    expect(wrapper.text()).toContain('2 periodos con datos')
    expect(wrapper.text()).toContain('Último pedido listo → salida')
    expect(wrapper.text()).not.toContain('referencia')
    expect(wrapper.text()).toContain('lunes, 5 oct 3 rutas')
    expect(wrapper.text()).toContain('jueves, 22 oct')
  })

  it('shows each stage in minutes and omits days without a complete sample', () => {
    const data = sample(4, 5, 20, 10)
    const wrapper = mount(DeliveryTimeBreakdown, { props: { summary: data, comparison: false,
      rows: [{ label: 'Sin datos', data: sample(0, null, null, null) }, { label: 'jueves, 22 oct', data }] } })
    expect(wrapper.text()).toContain('1. Espera en sucursal')
    expect(wrapper.text()).toContain('2. Entrega de pedidos')
    expect(wrapper.text()).toContain('3. Regreso a sucursal')
    expect(wrapper.text()).toContain('35 min en total')
    expect(wrapper.text()).toContain('jueves, 22 oct')
    expect(wrapper.text()).not.toContain('Sin datos')
    expect(wrapper.text()).toContain('Se omite 1 periodo')
  })

  it('keeps a valid zero instead of treating it as missing evidence', () => {
    const data = sample(1, 0, 10, 0)
    const wrapper = mount(DeliveryTimeBreakdown, { props: { summary: data, comparison: false, rows: [{ label: 'jueves', data }] } })
    expect(wrapper.text()).toContain('jueves')
    expect(wrapper.text()).toContain('Espera: 0 min')
    expect(wrapper.text()).toContain('10 min en total')
  })
})
