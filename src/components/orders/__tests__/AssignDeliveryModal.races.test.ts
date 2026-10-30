import { shallowMount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import AssignDeliveryModal from '../AssignDeliveryModal.vue'
import type { OrderListItem } from '@/types/order'

const mocks = vi.hoisted(() => ({
    options: vi.fn(), assign: vi.fn(), unassign: vi.fn(), success: vi.fn(), error: vi.fn(),
}))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({
    orderManagementApi: { options: mocks.options },
}))
vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: { assignDelivery: mocks.assign, unassignDelivery: mocks.unassign },
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: mocks.success, error: mocks.error }),
}))

function deferred<T>() {
    let resolve!: (data: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
const order = (id: number, deliveryManId: number | null = null): OrderListItem => ({
    id, branchId: 1, originBranchId: 1, type: 'delivery', status: 'ready',
    deliveryManId, deliveryManName: deliveryManId === null ? null : `Driver ${deliveryManId}`,
}) as OrderListItem
const options = (name: string, id = 20) => ({
    deliverymen: [{ id, name }], banks: [], apps: [], branchId: 1, branchName: 'Synthetic branch',
})

const stubs = {
    BaseDialog: { template: '<div><slot /><slot name="footer" /></div>' },
    BaseButton: {
        props: ['disabled', 'loading'],
        template: '<button type="button" :disabled="disabled || loading"><slot /></button>',
    },
    BaseSelect: {
        props: ['modelValue', 'options', 'loading'],
        template: `<select :value="modelValue == null ? '' : modelValue" :disabled="loading"
          @change="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))">
          <option v-for="item in options" :key="String(item.value)" :value="item.value == null ? '' : item.value">{{ item.label }}</option>
        </select>`,
    },
}
function render(value = order(10)) {
    return shallowMount(AssignDeliveryModal, {
        props: { open: true, order: value },
        global: { stubs },
    })
}
function button(wrapper: ReturnType<typeof render>, label: string) {
    const found = wrapper.findAll('button').find(x => x.text() === label)
    if (!found) throw new Error(`Button not found: ${label}`)
    return found
}

describe('M15-F02: order-scoped courier assignment modal', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.options.mockResolvedValue(options('Available courier'))
    })
    afterEach(() => { vi.restoreAllMocks() })

    it('loads options once at mount and forwards an abort signal', async () => {
        const wrapper = render()
        await flushPromises()
        expect(mocks.options).toHaveBeenCalledTimes(1)
        expect(mocks.options).toHaveBeenCalledWith(10, expect.any(AbortSignal))
        expect(wrapper.text()).toContain('Available courier')
        wrapper.unmount()
    })

    it('changing the order while open aborts the old options and prevents stale data', async () => {
        const old = deferred<ReturnType<typeof options>>()
        const next = deferred<ReturnType<typeof options>>()
        mocks.options.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
        const wrapper = render(order(10, 30))
        const originalSignal = mocks.options.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ order: order(11, 40) })
        expect(originalSignal.aborted).toBe(true)
        expect(mocks.options.mock.calls[1]![0]).toBe(11)
        expect(wrapper.find('select').element.value).toBe('')
        old.resolve(options('Previous courier', 30))
        await flushPromises()
        expect(wrapper.text()).not.toContain('Previous courier')
        expect(wrapper.get('select').attributes('disabled')).toBeDefined()
        next.resolve(options('Correct courier', 40))
        await flushPromises()
        expect(wrapper.text()).toContain('Correct courier')
        expect(wrapper.text()).not.toContain('Previous courier')
        expect(mocks.error).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('closing and reopening the same order aborts previous HTTP and keeps the new loading state', async () => {
        const old = deferred<ReturnType<typeof options>>(), fresh = deferred<ReturnType<typeof options>>()
        mocks.options.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
        const wrapper = render()
        const oldSignal = mocks.options.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ open: false })
        expect(oldSignal.aborted).toBe(true)
        await wrapper.setProps({ open: true })
        old.reject(new Error('old transport failure'))
        await flushPromises()
        expect(wrapper.get('select').attributes('disabled')).toBeDefined()
        expect(mocks.error).not.toHaveBeenCalled()
        fresh.resolve(options('Current courier'))
        await flushPromises()
        expect(wrapper.text()).toContain('Current courier')
        expect(wrapper.get('select').attributes('disabled')).toBeUndefined()
        wrapper.unmount()
    })

    it('unmounting aborts options without showing late failures', async () => {
        const pending = deferred<ReturnType<typeof options>>()
        mocks.options.mockReturnValue(pending.promise)
        const wrapper = render()
        const signal = mocks.options.mock.calls[0]![1] as AbortSignal
        wrapper.unmount()
        expect(signal.aborted).toBe(true)
        pending.reject(new Error('aborted request'))
        await flushPromises()
        expect(mocks.error).not.toHaveBeenCalled()
    })

    it('a mutation resolving after switching orders does not update the new modal', async () => {
        const mutation = deferred<{ status: string; deliveryManId: number }>()
        mocks.assign.mockReturnValue(mutation.promise)
        const wrapper = render()
        await flushPromises()
        await wrapper.find('select').setValue('20')
        await button(wrapper, 'Asignar').trigger('click')
        expect(mocks.assign).toHaveBeenCalledWith(10, 20, expect.objectContaining({ id: 10 }))
        await wrapper.setProps({ order: order(11) })
        await flushPromises()
        mutation.resolve({ status: 'on_the_way', deliveryManId: 20 })
        await flushPromises()
        expect(wrapper.emitted('updated')).toBeUndefined()
        expect(wrapper.emitted('statusChanged')).toBeUndefined()
        expect(wrapper.emitted('close')).toBeUndefined()
        expect(mocks.success).not.toHaveBeenCalled()
        expect(mocks.error).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('double submission is guarded, but one successful assignment emits the full result', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>()
        mocks.assign.mockReturnValue(pending.promise)
        const wrapper = render()
        await flushPromises()
        await wrapper.find('select').setValue('20')
        const save = button(wrapper, 'Asignar')
        await save.trigger('click')
        await save.trigger('click')
        expect(mocks.assign).toHaveBeenCalledTimes(1)
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 })
        await flushPromises()
        expect(wrapper.emitted('updated')?.[0]?.[0]).toEqual({ status: 'on_the_way', deliveryManId: 20 })
        expect(wrapper.emitted('statusChanged')?.[0]).toEqual(['on_the_way'])
        expect(wrapper.emitted('close')).toHaveLength(1)
        wrapper.unmount()
    })

    it('does not make a mutation when the current assignment is unchanged', async () => {
        const wrapper = render(order(10, 20))
        await flushPromises()
        await wrapper.find('select').setValue('20')
        expect(button(wrapper, 'Asignar').attributes('disabled')).toBeDefined()
        expect(mocks.assign).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('can still unassign once and reports actionable errors on the active order', async () => {
        const wrapper = render(order(10, 20))
        await flushPromises()
        await wrapper.find('select').setValue('')
        mocks.unassign.mockResolvedValue({ id: 10, deliveryManId: null, status: 'on_the_way' })
        await button(wrapper, 'Desasignar').trigger('click')
        await flushPromises()
        expect(mocks.unassign).toHaveBeenCalledWith(10, expect.objectContaining({ id: 10 }))
        expect(wrapper.emitted('updated')).toHaveLength(1)
        expect(mocks.success).toHaveBeenCalledTimes(1)
        wrapper.unmount()
    })
})
