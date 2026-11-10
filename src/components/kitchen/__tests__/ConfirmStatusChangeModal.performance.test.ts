import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmStatusChangeModal from '@/components/kitchen/ConfirmStatusChangeModal.vue'
import type { OrderListItem, OrderDetailItem } from '@/types/order'

const mocks = vi.hoisted(() => ({
    updateStatus: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    list: { items: [{ id: 1, status: 'in_preparation' }] },
}))

vi.mock('@/store/ordersData', () => ({
    useOrdersDataStore: () => ({ list: mocks.list, updateStatus: mocks.updateStatus }),
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: mocks.success, error: mocks.error }),
}))

const BaseDialogStub = {
    name: 'BaseDialog',
    props: ['modelValue', 'dismissible'],
    emits: ['update:modelValue'],
    template: '<div><slot /><slot name="footer" /></div>',
}
const BaseButtonStub = {
    name: 'BaseButton',
    props: ['loading', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="loading || disabled" @click="$emit(\'click\')"><slot /></button>',
}

function renderModal(status: 'taken' | 'in_preparation' = 'in_preparation', chainTakenToReady = false) {
    mocks.list.items = [{ id: 1, status }]
    const order = { id: 1, status, statusDisplayName: status, notes: null } as OrderListItem
    return mount(ConfirmStatusChangeModal, {
        props: {
            isOpen: true,
            orders: [order],
            orderItemsMap: new Map<number, OrderDetailItem[]>(),
            chainTakenToReady,
        },
        global: {
            stubs: { BaseDialog: BaseDialogStub, BaseButton: BaseButtonStub, BaseBadge: true },
        },
    })
}

function confirmButton(wrapper: ReturnType<typeof renderModal>) {
    const button = wrapper.findAll('button').find(el => el.text().includes('Confirmar y marcar como listos'))
    if (!button) throw new Error('Confirm button missing')
    return button
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('M13-F03 kitchen ready transition single-flight', () => {
    it('allows only one PUT for rapid double confirmation and locks dismissal until completion', async () => {
        let finish!: () => void
        const pending = new Promise<void>(resolve => { finish = resolve })
        mocks.updateStatus.mockImplementation(() => pending)
        const wrapper = renderModal()

        // Two DOM clicks in the same tick, before the disabled/loading DOM is refreshed.
        const button = confirmButton(wrapper).element
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(mocks.updateStatus).toHaveBeenCalledTimes(1)
        expect(mocks.updateStatus).toHaveBeenCalledWith(1, 'ready')
        await nextTick()
        const dialog = wrapper.findComponent({ name: 'BaseDialog' })
        expect(dialog.props('dismissible')).toBe(false)
        dialog.vm.$emit('update:modelValue', false)
        expect(wrapper.emitted('close')).toBeUndefined()
        finish()
        await flushPromises()
        expect(wrapper.emitted('updated')).toHaveLength(1)
        expect(wrapper.emitted('close')).toHaveLength(1)
        wrapper.unmount()
    })

    it('does not run two taken-to-ready chains while the first preparation PUT is pending', async () => {
        let finish!: () => void
        const pending = new Promise<void>(resolve => { finish = resolve })
        mocks.updateStatus.mockImplementationOnce(() => pending).mockResolvedValue(undefined)
        const wrapper = renderModal('taken', true)
        const button = confirmButton(wrapper).element
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        expect(mocks.updateStatus).toHaveBeenCalledTimes(1)
        expect(mocks.updateStatus).toHaveBeenNthCalledWith(1, 1, 'in_preparation')
        finish()
        await flushPromises()
        expect(mocks.updateStatus).toHaveBeenCalledTimes(2)
        expect(mocks.updateStatus).toHaveBeenNthCalledWith(2, 1, 'ready')
        expect(wrapper.emitted('updated')).toHaveLength(1)
        wrapper.unmount()
    })

    it('releases the guard after a failed PUT and allows an explicit retry', async () => {
        mocks.updateStatus.mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValue(undefined)
        const wrapper = renderModal()
        await confirmButton(wrapper).trigger('click')
        await flushPromises()
        expect(mocks.error).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted('close')).toBeUndefined()
        expect(wrapper.findComponent({ name: 'BaseDialog' }).props('dismissible')).toBe(true)

        await confirmButton(wrapper).trigger('click')
        await flushPromises()
        expect(mocks.updateStatus).toHaveBeenCalledTimes(2)
        expect(mocks.success).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted('updated')).toHaveLength(1)
        wrapper.unmount()
    })
})
