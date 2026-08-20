import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseYmdDateRangePicker from '@/components/ui/BaseYmdDateRangePicker.vue'
import { defaultBusinessCalendar } from '@/utils/datetime'

vi.mock('@vuepic/vue-datepicker', () => ({
    VueDatePicker: {
        name: 'VueDatePicker',
        props: ['modelValue', 'range'],
        emits: ['update:modelValue'],
        template: '<button type="button" />',
    },
}))

vi.mock('@/components/ui/BaseDateRangePicker.vue', () => ({
    default: {
        name: 'BaseDateRangePicker',
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<button type="button" />',
    },
}))

describe('BaseDatePicker', () => {
    it('emite la fecha elegida como YYYY-MM-DD del calendario de negocio', async () => {
        const wrapper = mount(BaseDatePicker, { props: { modelValue: '2026-08-20' } })
        const picker = wrapper.findComponent({ name: 'VueDatePicker' })

        await picker.vm.$emit('update:modelValue', new Date(2026, 7, 21))

        expect(wrapper.emitted('update:modelValue')).toEqual([['2026-08-21']])
        expect(wrapper.emitted('change')).toEqual([['2026-08-21']])
    })
})

describe('BaseYmdDateRangePicker', () => {
    it('emite los límites ordenados en YYYY-MM-DD y un único cambio', async () => {
        const wrapper = mount(BaseYmdDateRangePicker, {
            props: { fromDate: '2026-08-20', toDate: '2026-08-22' },
        })
        const picker = wrapper.findComponent({ name: 'BaseDateRangePicker' })
        const from = defaultBusinessCalendar.zonedDayFromPickerLocalDate(new Date(2026, 7, 20))
        const to = defaultBusinessCalendar.zonedDayFromPickerLocalDate(new Date(2026, 7, 22))

        await picker.vm.$emit('update:modelValue', [to, from])

        expect(wrapper.emitted('update:fromDate')).toEqual([['2026-08-20']])
        expect(wrapper.emitted('update:toDate')).toEqual([['2026-08-22']])
        expect(wrapper.emitted('change')).toEqual([[{ fromDate: '2026-08-20', toDate: '2026-08-22' }]])
    })
})
