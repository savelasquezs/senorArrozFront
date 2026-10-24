import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { useDeliveryPerformance } from '@/composables/dashboard/useDeliveryPerformance'
import DeliveryAnalyticsPanel from '@/components/dashboard/DeliveryAnalyticsPanel.vue'
import DashboardLineChart from '@/components/dashboard/DashboardLineChart.vue'
import DashboardHorizontalBarChart from '@/components/dashboard/DashboardHorizontalBarChart.vue'
import DeliveryTimeBreakdown from '@/components/dashboard/DeliveryTimeBreakdown.vue'
import BaseDateRangePicker from '@/components/ui/BaseDateRangePicker.vue'
import type { DeliveryPerformance, DeliveryPerformanceSummary } from '@/types/deliveryPerformance'

function summary(overrides: Partial<DeliveryPerformanceSummary> = {}): DeliveryPerformanceSummary {
  return { deliveredCount: 0, completedRoutesCount: 0, slaSampleCount: 0, routeSampleCount: 0, orderSampleCount: 0,
    gpsSampleCount: 0, stageSampleCount: 0, onTimePercent: null, avgRouteMinutes: null, avgMetaMinutes: null,
    avgOrderMinutes: null, p90OrderMinutes: null, minutesPerKm: null, ordersPerRoute: null,
    avgDispatchMinutes: null, avgDeliveryStageMinutes: null, avgReturnMinutes: null, totalGpsKm: 0, ...overrides }
}

describe('delivery performance cards', () => {
  it('reconciles all assigned orders and route states while preserving completed-only performance samples', () => {
    const current = summary({ assignedCount: 9, deliveredCount: 8, onTheWayCount: 1, routesCount: 6, completedRoutesCount: 4,
      inProgressRoutesCount: 1, returnPendingRoutesCount: 1, ordersPerRoute: 1.5, routeSampleCount: 4, avgRouteMinutes: 25 })
    const performance = { current, previous: summary(), driverOptions: [], drivers: [], evolution: [], labels: [], recentRoutes: [] } as DeliveryPerformance
    const { cards } = useDeliveryPerformance(() => performance)
    expect(cards.value.find(card => card.key === 'deliveredCount')).toMatchObject({ value: '8', sample: '9 asignados · 1 en camino' })
    expect(cards.value.find(card => card.key === 'ordersPerRoute')?.sample).toBe('4 cerradas de 6 rutas')
    const global = useDeliveryPerformance(() => ({ ...performance, current: { ...current, deliveredCount: 10 } }))
    expect(global.cards.value.find(card => card.key === 'deliveredCount')?.sample).toBe('9 asignados · 1 en camino · 2 sin domiciliario')
    const pending = useDeliveryPerformance(() => ({ ...performance, current: { ...current, assignedCount: 10, pendingCount: 2 } }))
    expect(pending.cards.value.find(card => card.key === 'deliveredCount')?.sample).toBe('10 asignados · 1 en camino · 1 otro pendiente')
    const wrapper = shallowMount(DeliveryAnalyticsPanel, { props: { performance, branchId: 1, driverId: 7, showBranchFilter: false,
      branchOptions: [], dateRange: [new Date(), new Date()] } })
    const states = wrapper.get('[aria-label="Estado de las rutas del periodo"]').text()
    expect(states).toContain('6 rutas en total')
    expect(states).toContain('4 cerradas')
    expect(states).toContain('1 en curso')
    expect(states).toContain('1 con regreso pendiente')
    wrapper.unmount()
  })

  it('identifies estimated distance samples and separates GPS from planned chart values', () => {
    const data = summary({ gpsSampleCount: 1, distanceSampleCount: 3, estimatedDistanceSampleCount: 2,
      minutesPerKm: 4, gpsMinutesPerKm: 10, estimatedMinutesPerKm: 3.33 })
    const { cards } = useDeliveryPerformance(() => ({ current: data, previous: summary() }) as DeliveryPerformance)
    expect(cards.value.find(card => card.key === 'minutesPerKm')?.sample).toBe('3 rutas · 2 estimadas')
    const driver = { ...data, id: 7, name: 'Domiciliario', branchId: 1 }
    const performance: DeliveryPerformance = { current: data, previous: summary(), team: data, teamEvolution: [data],
      labels: ['jueves'], evolution: [data], drivers: [driver], driverOptions: [driver], recentRoutes: [] }
    const wrapper = shallowMount(DeliveryAnalyticsPanel, { props: { performance, branchId: 1, driverId: 7, showBranchFilter: false,
      branchOptions: [], dateRange: [new Date(), new Date()] } })
    const chart = wrapper.findAllComponents(DashboardLineChart).find(chart => chart.props('datasets').some(dataset => dataset.label === 'Estimación planificada'))!
    expect(chart.props('datasets').map(dataset => dataset.data)).toEqual([[10], [3.33], [4]])
    expect(chart.props('datasets')[1]!.borderDash).toEqual([4, 3])
    expect(chart.props('datasets')[2]!.label).toBe('Resto del equipo')
    wrapper.unmount()
  })

  it('combines registered and assigned departures in one route duration series', () => {
    const data = summary({ routeSampleCount: 3, avgRouteMinutes: 30 })
    const { cards } = useDeliveryPerformance(() => ({ current: data, previous: summary() }) as DeliveryPerformance)
    expect(cards.value.find(card => card.key === 'avgRouteMinutes')?.sample).toBe('3 rutas con salida y regreso')
    const driver = { ...data, id: 7, name: 'Domiciliario', branchId: 1 }
    const performance: DeliveryPerformance = { current: data, previous: summary(), team: data, teamEvolution: [data],
      labels: ['jueves'], evolution: [data], drivers: [driver], driverOptions: [driver], recentRoutes: [] }
    const wrapper = shallowMount(DeliveryAnalyticsPanel, { props: { performance, branchId: 1, driverId: 7, showBranchFilter: false,
      branchOptions: [], dateRange: [new Date(), new Date()] } })
    const routeChart = wrapper.findAllComponents(DashboardLineChart).find(chart => chart.props('datasets')[0]?.data[0] === 30)!
    expect(routeChart.props('datasets').map(dataset => dataset.data)).toEqual([[30], [30]])
    expect(routeChart.props('datasets')[1]!.label).toBe('Resto del equipo')
    expect(wrapper.text()).not.toContain('Tiempo de referencia')
    wrapper.unmount()
  })

  it('keeps unknown measurements separate from an actual zero', () => {
    const { cards } = useDeliveryPerformance(() => ({ current: summary({ avgOrderMinutes: 0 }), previous: summary() }) as DeliveryPerformance)
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.value).toBe('0')
    expect(cards.value.find(c => c.key === 'minutesPerKm')?.value).toBe('—')
    expect(cards.value.find(c => c.key === 'onTimePercent')?.delta).toBe('Sin periodo anterior')
  })

  it('compares SLA in percentage points and delivery time in relative percent', () => {
    const { cards } = useDeliveryPerformance(() => ({ current: summary({ onTimePercent: 90, avgOrderMinutes: 15 }), previous: summary({ onTimePercent: 80, avgOrderMinutes: 20 }) }) as DeliveryPerformance)
    expect(cards.value.find(c => c.key === 'onTimePercent')?.delta).toBe('+10 pp vs periodo anterior')
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.delta).toBe('-25 % vs periodo anterior')
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.favorable).toBe(true)
  })

  it('updates samples and values when the selected dataset changes', () => {
    const payload = ref({ current: summary({ orderSampleCount: 8, avgOrderMinutes: 10 }), previous: summary() } as DeliveryPerformance)
    const { cards, charts } = useDeliveryPerformance(() => payload.value)
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.sample).toContain('8 pedidos')
    payload.value = { ...payload.value, current: summary({ orderSampleCount: 2, avgOrderMinutes: 30 }) }
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.value).toBe('30')
    expect(cards.value).toHaveLength(7)
    expect(charts).toHaveLength(7)
  })

  it('only compares the four requested indicators with the team for a selected driver', () => {
    const individual = ref(false)
    const payload = { current: summary({ onTimePercent: 90, avgRouteMinutes: 10, avgOrderMinutes: 15, minutesPerKm: 4, p90OrderMinutes: 30 }),
      previous: summary({ avgOrderMinutes: 20, p90OrderMinutes: 40 }),
      team: summary({ onTimePercent: 80, avgRouteMinutes: 12, avgOrderMinutes: 20, minutesPerKm: 4 }) } as DeliveryPerformance
    const { cards } = useDeliveryPerformance(() => payload, () => individual.value)
    expect(cards.value.every(card => card.referenceLabel === null)).toBe(true)
    individual.value = true
    expect(cards.value.filter(card => card.referenceLabel)).toHaveLength(4)
    expect(cards.value.find(c => c.key === 'onTimePercent')?.delta).toBe('10 pp más que el resto')
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.delta).toBe('5 min menos que el resto')
    expect(cards.value.find(c => c.key === 'avgRouteMinutes')?.referenceLabel).toBe('Resto: 12 min')
    expect(cards.value.find(c => c.key === 'minutesPerKm')?.delta).toBe('Igual al resto del equipo')
    expect(cards.value.find(c => c.key === 'minutesPerKm')?.favorable).toBe(null)
    expect(cards.value.find(c => c.key === 'p90OrderMinutes')?.delta).toBe('-25 % vs periodo anterior')
    individual.value = false
    expect(cards.value.every(card => card.referenceLabel === null)).toBe(true)
  })

  it('keeps missing team measurements distinct from a zero benchmark', () => {
    const { cards } = useDeliveryPerformance(() => ({ current: summary({ onTimePercent: 25, avgOrderMinutes: 5 }),
      previous: summary(), team: summary({ onTimePercent: 0 }) }) as DeliveryPerformance, () => true)
    expect(cards.value.find(c => c.key === 'onTimePercent')?.delta).toBe('25 pp más que el resto')
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.referenceLabel).toBe('Resto: sin datos')
    expect(cards.value.find(c => c.key === 'avgOrderMinutes')?.delta).toBe('Sin comparación disponible')
  })

  it('shows references only for a single driver and preserves the same data in expanded charts', async () => {
    const data = summary({ deliveredCount: 2, onTimePercent: 90, avgRouteMinutes: 10, avgOrderMinutes: 5, minutesPerKm: 2, ordersPerRoute: 1 })
    const driver = { ...data, id: 7, name: 'Domiciliario', branchId: 1 }
    const performance: DeliveryPerformance = { current: data, previous: summary(), team: data, teamEvolution: [data],
      labels: ['jueves'], evolution: [data], drivers: [driver], driverOptions: [driver], recentRoutes: [] }
    const wrapper = shallowMount(DeliveryAnalyticsPanel, { props: { performance, branchId: 1, driverId: 'all', showBranchFilter: true,
      branchOptions: [{ id: 1, name: 'Sucursal' }], dateRange: [new Date(), new Date()] }, global: { stubs: { BaseDialog: false, teleport: true } } })
    expect(wrapper.text()).not.toContain('Resto:')
    expect(wrapper.findAllComponents(DashboardHorizontalBarChart)).toHaveLength(6)
    await wrapper.setProps({ driverId: 7 })
    const selectedRange: [Date, Date] = [new Date('2026-10-22T05:00:00Z'), new Date('2026-10-23T05:00:00Z')]
    wrapper.findComponent(BaseDateRangePicker).vm.$emit('update:modelValue', selectedRange)
    expect(wrapper.emitted('update:dateRange')?.[0]).toEqual([selectedRange])
    expect(wrapper.props('driverId')).toBe(7)
    expect(wrapper.props('branchId')).toBe(1)
    await wrapper.setProps({ dateRange: selectedRange })
    expect(wrapper.text().match(/Resto:/g)).toHaveLength(4)
    const charts = wrapper.findAllComponents(DashboardLineChart)
    expect(charts).toHaveLength(6)
    expect(charts.filter(chart => chart.props('datasets').some(dataset => dataset.label === 'Resto del equipo'))).toHaveLength(4)
    expect(charts[0]!.props('datasets')[1]!.borderDash).toEqual([6, 4])
    const expandButtons = wrapper.findAll('button[aria-haspopup="dialog"]')
    expect(expandButtons).toHaveLength(7)
    await expandButtons[0]!.trigger('click')
    expect(wrapper.find('[role="dialog"]').text()).toContain('excluye a Domiciliario')
    const expanded = wrapper.findAllComponents(DashboardLineChart).find(chart => chart.props('expanded'))!
    expect(expanded.props('datasets')).toEqual(charts[0]!.props('datasets'))
    expect(expanded.props('labels')).toEqual(['jueves'])
    await wrapper.get('[aria-label="Cerrar diálogo"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await expandButtons[6]!.trigger('click')
    const expandedStages = wrapper.findAllComponents(DeliveryTimeBreakdown).find(chart => !chart.props('compact'))!
    expect(expandedStages.props('summary')).toEqual(data)
    await wrapper.get('[aria-label="Cerrar diálogo"]').trigger('click')
    await wrapper.setProps({ performance: { ...performance, current: summary(), drivers: [], driverOptions: [], evolution: [], teamEvolution: [], labels: [] } })
    const driverSelect = wrapper.get('select[aria-label="Domiciliario"]').element as HTMLSelectElement
    expect(driverSelect.value).toBe('7')
    expect(driverSelect.selectedOptions[0]!.textContent).toBe('Domiciliario')
    await wrapper.setProps({ driverId: 'all' })
    expect(wrapper.text()).not.toContain('Resto:')
    expect(wrapper.findAllComponents(DashboardLineChart)).toHaveLength(0)
  })
})
