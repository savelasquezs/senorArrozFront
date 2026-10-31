import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { reactive } from 'vue'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import AssignDeliveryModal from '../AssignDeliveryModal.vue'
import { useAuthStore } from '@/store/auth'
import type { OrderListItem } from '@/types/order'

const mocks = vi.hoisted(() => ({ options: vi.fn(), assign: vi.fn(), unassign: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { options: mocks.options } }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: { assignDelivery: mocks.assign, unassignDelivery: mocks.unassign } }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: mocks.success, error: mocks.error }) }))

function deferred<T>() {
    let resolve!: (data: T) => void, reject!: (error: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
const order = (id: number, deliveryManId: number | null = null): OrderListItem => ({
    id, branchId: 1, originBranchId: 1, type: 'delivery', status: 'ready', managementVersion: 1,
    deliveryManId, deliveryManName: deliveryManId === null ? null : `Driver ${deliveryManId}`,
}) as OrderListItem
const options = (name: string, id = 20) => ({
    deliverymen: [{ id, name }], banks: [], apps: [], branchId: 1, branchName: 'Synthetic branch',
})
const stubs = {
    BaseDialog: { template: '<div><slot /><slot name="footer" /></div>' },
    BaseButton: { props: ['disabled', 'loading'], template: '<button type="button" :disabled="disabled || loading"><slot /></button>' },
    BaseSelect: {
        props: ['modelValue', 'options', 'loading', 'disabled'],
        template: `<select :value="modelValue == null ? '' : modelValue" :disabled="loading || disabled"
          @change="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))">
          <option v-for="item in options" :key="String(item.value)" :value="item.value == null ? '' : item.value">{{ item.label }}</option>
        </select>`,
    },
}
let pinia: Pinia
const wrappers: VueWrapper[] = []
function render(value = order(10)) {
    const wrapper = shallowMount(AssignDeliveryModal, { props: { open: true, order: value }, global: { stubs, plugins: [pinia] } })
    wrappers.push(wrapper); return wrapper
}
function unmount(wrapper: VueWrapper) { wrapper.unmount(); wrappers.splice(wrappers.indexOf(wrapper), 1) }
function button(wrapper: VueWrapper, label: string) {
    const found = wrapper.findAll('button').find(x => x.text() === label)
    if (!found) throw new Error(`Button not found: ${label}`)
    return found
}

describe('M15-F02: order-scoped courier assignment modal', () => {
    beforeEach(() => {
        vi.resetAllMocks(); localStorage.clear(); pinia = createPinia(); setActivePinia(pinia)
        useAuthStore().user = { id: 7, branchId: 1, role: 'Admin', accountType: 'personal' } as never
        mocks.options.mockResolvedValue(options('Available courier'))
    })
    afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); disposePinia(pinia); vi.restoreAllMocks() })

    it('loads options once at mount and forwards an abort signal', async () => {
        const wrapper = render(); await flushPromises()
        expect(mocks.options).toHaveBeenCalledExactlyOnceWith(10, expect.any(AbortSignal))
        expect(wrapper.text()).toContain('Available courier')
    })
    it('changing the order aborts old options and prevents stale data', async () => {
        const old = deferred<ReturnType<typeof options>>(), next = deferred<ReturnType<typeof options>>()
        mocks.options.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise)
        const wrapper = render(order(10, 30)); const signal = mocks.options.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ order: order(11, 40) })
        expect(signal.aborted).toBe(true); expect(mocks.options.mock.calls[1]![0]).toBe(11)
        old.resolve(options('Previous courier', 30)); await flushPromises()
        expect(wrapper.text()).not.toContain('Previous courier')
        expect(wrapper.get('select').attributes('disabled')).toBeDefined()
        next.resolve(options('Correct courier', 40)); await flushPromises()
        expect(wrapper.text()).toContain('Correct courier'); expect(mocks.error).not.toHaveBeenCalled()
    })
    it('closing/reopening the same order keeps the new loading state', async () => {
        const old = deferred<ReturnType<typeof options>>(), fresh = deferred<ReturnType<typeof options>>()
        mocks.options.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
        const wrapper = render(), signal = mocks.options.mock.calls[0]![1] as AbortSignal
        await wrapper.setProps({ open: false }); expect(signal.aborted).toBe(true)
        await wrapper.setProps({ open: true }); old.reject(new Error('old transport failure')); await flushPromises()
        expect(wrapper.get('select').attributes('disabled')).toBeDefined(); expect(mocks.error).not.toHaveBeenCalled()
        fresh.resolve(options('Current courier')); await flushPromises()
        expect(wrapper.get('select').attributes('disabled')).toBeUndefined()
    })
    it('unmount aborts options without late errors', async () => {
        const pending = deferred<ReturnType<typeof options>>(); mocks.options.mockReturnValue(pending.promise)
        const wrapper = render(), signal = mocks.options.mock.calls[0]![1] as AbortSignal
        unmount(wrapper); expect(signal.aborted).toBe(true)
        pending.reject(new Error('aborted')); await flushPromises(); expect(mocks.error).not.toHaveBeenCalled()
    })
    it('a mutation after switching orders does not update the new modal', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const wrapper = render(); await flushPromises(); await wrapper.get('select').setValue('20'); await button(wrapper, 'Asignar').trigger('click')
        expect(mocks.assign).toHaveBeenCalledWith(10, 20, expect.objectContaining({ id: 10, managementVersion: 1 }))
        await wrapper.setProps({ order: order(11) }); await flushPromises()
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(wrapper.emitted('updated')).toBeUndefined(); expect(wrapper.emitted('statusChanged')).toBeUndefined()
        expect(wrapper.emitted('close')).toBeUndefined(); expect(mocks.success).not.toHaveBeenCalled()
    })
    it('double submission is guarded and one success emits the full response', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const wrapper = render(); await flushPromises(); await wrapper.get('select').setValue('20')
        await button(wrapper, 'Asignar').trigger('click'); await button(wrapper, 'Asignar').trigger('click')
        expect(mocks.assign).toHaveBeenCalledTimes(1)
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(wrapper.emitted('updated')?.[0]?.[0]).toEqual({ status: 'on_the_way', deliveryManId: 20 })
        expect(wrapper.emitted('statusChanged')?.[0]).toEqual(['on_the_way']); expect(wrapper.emitted('close')).toHaveLength(1)
    })
    it('guards the same order after closing/reopening during save', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const wrapper = render(); await flushPromises(); await wrapper.get('select').setValue('20'); await button(wrapper, 'Asignar').trigger('click')
        await wrapper.setProps({ open: false }); await wrapper.setProps({ open: true }); await flushPromises()
        expect(wrapper.get('select').attributes('disabled')).toBeDefined(); expect(mocks.assign).toHaveBeenCalledTimes(1)
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(wrapper.emitted('updated')).toBeUndefined()
        await wrapper.get('select').setValue('20'); expect(button(wrapper, 'Asignar').attributes('disabled')).toBeUndefined()
    })
    it('does not mutate when assignment is unchanged', async () => {
        const wrapper = render(order(10, 20)); await flushPromises(); await wrapper.get('select').setValue('20')
        expect(button(wrapper, 'Asignar').attributes('disabled')).toBeDefined(); expect(mocks.assign).not.toHaveBeenCalled()
    })
    it('can still unassign once', async () => {
        const wrapper = render(order(10, 20)); await flushPromises(); await wrapper.get('select').setValue('')
        mocks.unassign.mockResolvedValue({ id: 10, deliveryManId: null, status: 'on_the_way' })
        await button(wrapper, 'Desasignar').trigger('click'); await flushPromises()
        expect(mocks.unassign).toHaveBeenCalledWith(10, expect.objectContaining({ id: 10 }))
        expect(wrapper.emitted('updated')).toHaveLength(1)
    })
    it('keeps the mutation lock across a complete modal unmount/remount', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const first = render(); await flushPromises(); await first.get('select').setValue('20'); await button(first, 'Asignar').trigger('click')
        unmount(first)
        const second = render(); await flushPromises()
        expect(second.get('select').attributes('disabled')).toBeDefined()
        expect(mocks.assign).toHaveBeenCalledTimes(1)
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(second.emitted('updated')).toBeUndefined(); expect(mocks.success).not.toHaveBeenCalled()
        expect(second.get('select').attributes('disabled')).toBeUndefined()
    })
    it('blocks writes after options failure and offers an explicit retry', async () => {
        mocks.options.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(options('Retry courier'))
        const wrapper = render(order(10, 20)); await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('Unavailable')
        expect(wrapper.get('select').attributes('disabled')).toBeDefined()
        expect(mocks.unassign).not.toHaveBeenCalled()
        await button(wrapper, 'Reintentar').trigger('click'); await flushPromises()
        expect(wrapper.get('select').attributes('disabled')).toBeUndefined()
        await wrapper.get('select').setValue(''); expect(button(wrapper, 'Desasignar').attributes('disabled')).toBeUndefined()
    })
    it('logout aborts options and ignores their private response', async () => {
        const pending = deferred<ReturnType<typeof options>>(); mocks.options.mockReturnValue(pending.promise)
        const wrapper = render(), signal = mocks.options.mock.calls[0]![1] as AbortSignal
        useAuthStore().user = null
        expect(signal.aborted).toBe(true)
        pending.resolve(options('Old session courier')); await flushPromises()
        expect(wrapper.text()).not.toContain('Old session courier'); expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    })
    it('changing session during a PUT does not emit into the new session or cancel the write', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const wrapper = render(); await flushPromises(); await wrapper.get('select').setValue('20'); await button(wrapper, 'Asignar').trigger('click')
        useAuthStore().user = { ...useAuthStore().user!, id: 8 }
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(wrapper.emitted('updated')).toBeUndefined(); expect(mocks.success).not.toHaveBeenCalled()
        expect(mocks.assign).toHaveBeenCalledTimes(1)
    })
    it('captures the original version and discards a result superseded by a newer order snapshot', async () => {
        const pending = deferred<{ status: string; deliveryManId: number }>(); mocks.assign.mockReturnValue(pending.promise)
        const value = reactive(order(10)), wrapper = render(value)
        await flushPromises(); await wrapper.get('select').setValue('20'); await button(wrapper, 'Asignar').trigger('click')
        value.managementVersion = 2
        expect(mocks.assign.mock.calls[0]![2].managementVersion).toBe(1)
        pending.resolve({ status: 'on_the_way', deliveryManId: 20 }); await flushPromises()
        expect(wrapper.emitted('updated')).toBeUndefined()
    })
})
