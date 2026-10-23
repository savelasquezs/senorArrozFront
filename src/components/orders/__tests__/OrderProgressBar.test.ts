import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderProgressBar from '../OrderProgressBar.vue'
import { orderDurations } from '@/helpers/orderDurations'

const statusTimes = {
    taken: '2026-10-22T15:00:00Z', ready: '2026-10-22T15:30:00Z',
    ontheway: '2026-10-22T15:40:00Z', delivered: '2026-10-22T16:20:00Z',
}

describe('OrderProgressBar durations', () => {
    it('shows preparation, delivery and the full time including the wait for dispatch', () => {
        const wrapper = mount(OrderProgressBar, { props: { compact: true, currentStatus: 'delivered', statusTimes } })
        const summary = wrapper.get('[aria-label="Tiempos del pedido"]').text()
        expect(summary).toContain('30 min en preparación')
        expect(summary).toContain('40 min en entrega')
        expect(summary).toContain('80 min total')
        wrapper.unmount()
    })

    it('uses scheduled preparation instead of the reservation creation day', () => {
        expect(orderDurations({ ...statusTimes, taken: '2026-10-20T15:00:00Z' }, '2026-10-22T15:10:00Z'))
            .toEqual({ preparation: 20, delivery: 40, total: 70 })
    })

    it('does not invent times while delivery is incomplete', () => {
        expect(orderDurations({ taken: statusTimes.taken, ready: statusTimes.ready }))
            .toEqual({ preparation: 30, delivery: null, total: null })
    })

    it('does not report negative or invalid intervals as valid durations', () => {
        expect(orderDurations({ ...statusTimes, taken: '2026-10-24T15:00:00Z' })).toEqual({ preparation: null, delivery: 40, total: null })
        expect(orderDurations({ ...statusTimes, ready: 'invalid', ontheway: 'invalid' }))
            .toEqual({ preparation: null, delivery: null, total: 80 })
        expect(orderDurations({})).toEqual({ preparation: null, delivery: null, total: null })
    })

    it('falls back to Taken when the order was completed before its scheduled preparation', () => {
        expect(orderDurations(statusTimes, '2026-10-24T15:00:00Z')).toEqual({ preparation: 30, delivery: 40, total: 80 })
    })

    it('accepts snake case state keys and compares actual instants across timezone offsets', () => {
        expect(orderDurations({ taken: '2026-10-22T10:00:00-05:00', ready: statusTimes.ready,
            on_the_way: statusTimes.ontheway, delivered: statusTimes.delivered }))
            .toEqual({ preparation: 30, delivery: 40, total: 80 })
    })

    it('preserves state actions and omits the delivery interval for pickup orders', async () => {
        const wrapper = mount(OrderProgressBar, { props: { compact: true, clickable: true, orderType: 'onsite', currentStatus: 'ready', statusTimes } })
        expect(wrapper.get('[aria-label="Tiempos del pedido"]').text()).not.toContain('en entrega')
        await wrapper.findAll('button').find(button => button.text().includes('Entregado'))!.trigger('click')
        expect(wrapper.emitted('status-click')).toEqual([['delivered']])
        wrapper.unmount()
    })
})
