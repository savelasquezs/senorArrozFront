import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerSelector from '../CustomerSelector.vue'
import type { Customer } from '@/types/customer'

const mocks = vi.hoisted(() => ({
    searchCustomers: vi.fn(),
    showError: vi.fn(),
    success: vi.fn(),
}))
vi.mock('@/store/customers', () => ({
    useCustomersStore: () => ({
        searchCustomers: mocks.searchCustomers,
        create: vi.fn(),
    }),
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: mocks.success, error: mocks.showError }),
}))

function customer(name: string): Customer {
    return { id: name === 'Nuevo' ? 2 : 1, name, branchId: 1, active: true } as Customer
}
function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
    return { promise, resolve, reject }
}
function render(branchId = 1) {
    // Keep BaseInput real so its native input event exercises the production path.
    return shallowMount(CustomerSelector, {
        props: { branchId },
        global: { stubs: { BaseInput: false } },
    })
}

describe('M06-F01 customer lookup concurrency', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    })
    afterEach(() => vi.useRealTimers())

    it('does not issue a search after the input shrinks to one character', async () => {
        const wrapper = render()
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(200)
        await wrapper.get('input').setValue('3')
        vi.advanceTimersByTime(500)
        await flushPromises()
        expect(mocks.searchCustomers).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('does not allow an older phone response to replace newer results', async () => {
        const old = deferred<Customer[]>(), recent = deferred<Customer[]>()
        mocks.searchCustomers.mockImplementation((q: string) => q === '300' ? old.promise : recent.promise)
        const wrapper = render()
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(400)
        expect(mocks.searchCustomers).toHaveBeenCalledWith('300', 1)
        await wrapper.get('input').setValue('301')
        vi.advanceTimersByTime(400)
        recent.resolve([customer('Nuevo')])
        await flushPromises()
        old.resolve([customer('Anterior')])
        await flushPromises()
        expect(wrapper.text()).toContain('Nuevo')
        expect(wrapper.text()).not.toContain('Anterior')
        expect(mocks.searchCustomers).toHaveBeenCalledTimes(2)
        wrapper.unmount()
    })

    it('does not restore old customers after clearing the phone', async () => {
        const old = deferred<Customer[]>()
        mocks.searchCustomers.mockReturnValue(old.promise)
        const wrapper = render()
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(400)
        await wrapper.get('input').setValue('')
        old.resolve([customer('Anterior')])
        await flushPromises()
        expect(wrapper.text()).not.toContain('Anterior')
        wrapper.unmount()
    })

    it('reissues for the new branch and never displays results from the previous one', async () => {
        const old = deferred<Customer[]>(), recent = deferred<Customer[]>()
        mocks.searchCustomers.mockImplementation((_: string, branchId: number) => branchId === 1 ? old.promise : recent.promise)
        const wrapper = render(1)
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(400)
        await wrapper.setProps({ branchId: 2 })
        vi.advanceTimersByTime(400)
        expect(mocks.searchCustomers).toHaveBeenNthCalledWith(1, '300', 1)
        expect(mocks.searchCustomers).toHaveBeenNthCalledWith(2, '300', 2)
        recent.resolve([customer('Nuevo')])
        await flushPromises()
        old.resolve([customer('Anterior')])
        await flushPromises()
        expect(wrapper.text()).toContain('Nuevo')
        expect(wrapper.text()).not.toContain('Anterior')
        wrapper.unmount()
    })

    it('ignores failures from a superseded lookup without showing a stale toast', async () => {
        const old = deferred<Customer[]>(), recent = deferred<Customer[]>()
        mocks.searchCustomers.mockImplementation((q: string) => q === '300' ? old.promise : recent.promise)
        const wrapper = render()
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(400)
        await wrapper.get('input').setValue('301')
        vi.advanceTimersByTime(400)
        recent.resolve([customer('Nuevo')])
        await flushPromises()
        old.reject(new Error('old request failed'))
        await flushPromises()
        expect(wrapper.text()).toContain('Nuevo')
        expect(mocks.showError).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('ignores a request completing after the selector has unmounted', async () => {
        const old = deferred<Customer[]>()
        mocks.searchCustomers.mockReturnValue(old.promise)
        const wrapper = render()
        await wrapper.get('input').setValue('300')
        vi.advanceTimersByTime(400)
        wrapper.unmount()
        old.reject(new Error('closed'))
        await flushPromises()
        expect(mocks.showError).not.toHaveBeenCalled()
    })
})
