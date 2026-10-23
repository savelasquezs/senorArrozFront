import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderScheduleFields from '../OrderScheduleFields.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { orderScheduleDate, orderScheduleError } from '@/helpers/orderSchedule'

function render() {
    return mount(OrderScheduleFields, { props: {
        prepareAt: new Date('2026-10-24T15:00:00Z'),
        reservedFor: new Date('2026-10-24T16:00:00Z'),
    } })
}

function change(wrapper: ReturnType<typeof render>) {
    return wrapper.emitted('change')!.at(-1)![0] as { prepareAt: Date | null; reservedFor: Date | null }
}

function timePickers(wrapper: ReturnType<typeof render>) {
    return wrapper.findAllComponents(VueDatePicker).filter(picker => picker.props('timePicker'))
}

describe('shared order schedule fields', () => {
    it('loads one Colombia date and both hours without changing the persisted schedule', () => {
        const wrapper = render()
        expect(wrapper.getComponent(BaseDatePicker).props('modelValue')).toBe('2026-10-24')
        expect(timePickers(wrapper).map(picker => picker.props('modelValue'))).toEqual([{ hours: 10, minutes: 0 }, { hours: 11, minutes: 0 }])
        expect(wrapper.find('input[type="date"], input[type="time"]').exists()).toBe(false)
        expect(wrapper.emitted('change')).toBeUndefined()
        wrapper.unmount()
    })

    it('suggests delivery one hour after preparation with the same minutes and date', async () => {
        const wrapper = render()
        timePickers(wrapper)[0]!.vm.$emit('update:model-value', { hours: 14, minutes: 25 })
        expect(change(wrapper).prepareAt?.toISOString()).toBe('2026-10-24T19:25:00.000Z')
        expect(change(wrapper).reservedFor?.toISOString()).toBe('2026-10-24T20:25:00.000Z')
        wrapper.unmount()
    })

    it('allows manual delivery and preserves both hours when changing the common date', async () => {
        const wrapper = render()
        timePickers(wrapper)[1]!.vm.$emit('update:model-value', { hours: 11, minutes: 45 })
        await wrapper.setProps(change(wrapper))
        wrapper.getComponent(BaseDatePicker).vm.$emit('update:modelValue', '2026-10-25')
        expect(change(wrapper).prepareAt?.toISOString()).toBe('2026-10-25T15:00:00.000Z')
        expect(change(wrapper).reservedFor?.toISOString()).toBe('2026-10-25T16:45:00.000Z')
        wrapper.unmount()
    })

    it('does not move delivery silently to the next day for late preparation', async () => {
        const wrapper = render()
        timePickers(wrapper)[0]!.vm.$emit('update:model-value', { hours: 23, minutes: 30 })
        expect(change(wrapper).prepareAt?.toISOString()).toBe('2026-10-25T04:30:00.000Z')
        expect(change(wrapper).reservedFor).toBeNull()
        await wrapper.setProps(change(wrapper))
        expect(wrapper.get('[role="alert"]').text()).toContain('preparación y de entrega')
        wrapper.unmount()
    })

    it('validates the same business day and the existing minimum forty minute interval', () => {
        const prep = orderScheduleDate('2026-10-24','10:00')!
        expect(orderScheduleError(prep,orderScheduleDate('2026-10-24','10:40'))).toBe('')
        expect(orderScheduleError(prep,orderScheduleDate('2026-10-24','10:39'))).toContain('40 minutos')
        expect(orderScheduleError(prep,orderScheduleDate('2026-10-25','11:00'))).toContain('mismo día')
    })
})
