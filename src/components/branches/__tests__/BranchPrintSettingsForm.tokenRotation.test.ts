import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BranchPrintSettingsForm from '../BranchPrintSettingsForm.vue'

const mocks = vi.hoisted(() => ({
    confirmDialog: vi.fn(),
    rotateBranchAgentToken: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
}))

vi.mock('@/composables/useDialog', () => ({
    useDialog: () => ({ confirmDialog: mocks.confirmDialog }),
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: mocks.success, error: mocks.error }),
}))
vi.mock('@/services/MainAPI/branchApi', () => ({
    apiStaticOrigin: () => '',
    branchApi: { rotateBranchAgentToken: mocks.rotateBranchAgentToken },
}))

function renderForm() {
    const wrapper = mount(BranchPrintSettingsForm, {
        props: { branchId: 7, initial: null },
        global: {
            stubs: {
                BaseInput: true,
                BaseSelect: true,
                BaseAlert: true,
                BaseDialog: true,
            },
        },
    })
    const rotate = wrapper.findAll('button').find(button => button.text().includes('Regenerar token'))
    expect(rotate).toBeDefined()
    return { wrapper, rotate: rotate! }
}

describe('M14-F05: rotación de token de impresión', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('impide abrir dos confirmaciones y efectuar dos rotaciones mientras la primera está pendiente', async () => {
        let resolveConfirm: (confirmed: boolean) => void = () => {}
        mocks.confirmDialog.mockImplementation(
            () => new Promise<boolean>(resolve => { resolveConfirm = resolve }),
        )
        mocks.rotateBranchAgentToken.mockResolvedValue({ data: { plainToken: 'token-de-prueba' } })
        const { wrapper, rotate } = renderForm()

        await rotate.trigger('click')
        expect(rotate.attributes('disabled')).toBeDefined()
        await rotate.trigger('click')
        expect(mocks.confirmDialog).toHaveBeenCalledTimes(1)
        expect(mocks.rotateBranchAgentToken).not.toHaveBeenCalled()

        resolveConfirm(true)
        await flushPromises()
        expect(mocks.rotateBranchAgentToken).toHaveBeenCalledExactlyOnceWith(7)
        expect(rotate.attributes('disabled')).toBeUndefined()
        wrapper.unmount()
    })

    it('libera el bloqueo al cancelar y permite volver a confirmar', async () => {
        mocks.confirmDialog.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
        mocks.rotateBranchAgentToken.mockResolvedValue({ data: { plainToken: 'token-de-prueba' } })
        const { wrapper, rotate } = renderForm()

        await rotate.trigger('click')
        await flushPromises()
        expect(mocks.rotateBranchAgentToken).not.toHaveBeenCalled()
        expect(rotate.attributes('disabled')).toBeUndefined()

        await rotate.trigger('click')
        await flushPromises()
        expect(mocks.confirmDialog).toHaveBeenCalledTimes(2)
        expect(mocks.rotateBranchAgentToken).toHaveBeenCalledExactlyOnceWith(7)
        wrapper.unmount()
    })

    it('permite reintentar tras un fallo HTTP sin repetir automáticamente la rotación', async () => {
        mocks.confirmDialog.mockResolvedValue(true)
        mocks.rotateBranchAgentToken
            .mockRejectedValueOnce(new Error('sin red'))
            .mockResolvedValueOnce({ data: { plainToken: 'token-de-prueba' } })
        const { wrapper, rotate } = renderForm()

        await rotate.trigger('click')
        await flushPromises()
        expect(mocks.error).toHaveBeenCalledTimes(1)
        expect(rotate.attributes('disabled')).toBeUndefined()

        await rotate.trigger('click')
        await flushPromises()
        expect(mocks.rotateBranchAgentToken).toHaveBeenCalledTimes(2)
        expect(mocks.success).toHaveBeenCalledTimes(1)
        wrapper.unmount()
    })
})
