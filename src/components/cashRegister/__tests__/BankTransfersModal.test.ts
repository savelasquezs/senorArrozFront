import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BankTransfersModal from '@/components/cashRegister/BankTransfersModal.vue'

const apiMocks = vi.hoisted(() => ({
    getBanks: vi.fn(),
    getBankTransfers: vi.fn(),
    createBankTransfer: vi.fn(),
}))

vi.mock('@/services/MainAPI/bankApi', () => ({
    bankApi: { getBanks: apiMocks.getBanks },
}))

vi.mock('@/services/MainAPI/bankTransferApi', () => ({
    bankTransferApi: {
        getBankTransfers: apiMocks.getBankTransfers,
        createBankTransfer: apiMocks.createBankTransfer,
    },
}))

const banks = [
    { id: 1, name: 'Banco Uno', branchId: 7, active: true },
    { id: 2, name: 'Banco Dos', branchId: 7, active: true },
]

function transferPage(page = 1, totalPages = 1) {
    return {
        items: [
            {
                id: page,
                fromBankId: 1,
                fromBankName: 'Banco Uno',
                toBankId: 2,
                toBankName: 'Banco Dos',
                amount: 10000,
                note: 'Prueba',
                createdAt: '2026-08-06T15:00:00.000Z',
                createdById: 3,
                createdByName: 'Caja',
            },
        ],
        page,
        pageSize: 15,
        totalPages,
        totalCount: totalPages * 15,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
    }
}

function mountModal() {
    return mount(BankTransfersModal, {
        props: { modelValue: true, branchId: 7 },
        global: { stubs: { Teleport: true } },
    })
}

async function openAndFillForm(wrapper: ReturnType<typeof mountModal>) {
    const newTransfer = wrapper.findAll('button').find((button) => button.text().includes('Nueva transferencia'))
    if (!newTransfer) throw new Error('missing new transfer button')
    await newTransfer.trigger('click')

    const selects = wrapper.findAll('select')
    await selects[0].setValue('1')
    await selects[1].setValue('2')
    await wrapper.get('input[type="number"]').setValue('25000')
}

describe('BankTransfersModal', () => {
    beforeEach(() => {
        apiMocks.getBanks.mockReset().mockResolvedValue({ items: banks })
        apiMocks.getBankTransfers.mockReset().mockResolvedValue(transferPage())
        apiMocks.createBankTransfer.mockReset().mockResolvedValue({ id: 99 })
    })

    it('carga bancos e historial para la sucursal activa y conserva la paginación', async () => {
        apiMocks.getBankTransfers
            .mockResolvedValueOnce(transferPage(1, 2))
            .mockResolvedValueOnce(transferPage(2, 2))

        const wrapper = mountModal()
        await flushPromises()

        expect(apiMocks.getBanks).toHaveBeenCalledWith(expect.objectContaining({ branchId: 7 }))
        expect(apiMocks.getBankTransfers).toHaveBeenNthCalledWith(1, expect.objectContaining({ branchId: 7, page: 1 }))

        const next = wrapper.findAll('button').find((button) => button.text() === 'Siguiente')
        if (!next) throw new Error('missing next button')
        await next.trigger('click')
        await flushPromises()

        expect(apiMocks.getBankTransfers).toHaveBeenLastCalledWith(expect.objectContaining({ branchId: 7, page: 2 }))
    })

    it('cierra y emite saved solamente después de registrar el movimiento', async () => {
        const wrapper = mountModal()
        await flushPromises()
        await openAndFillForm(wrapper)

        const submit = wrapper.findAll('button').find((button) => button.text() === 'Transferir')
        if (!submit) throw new Error('missing submit button')
        await submit.trigger('click')
        await flushPromises()

        expect(apiMocks.createBankTransfer).toHaveBeenCalledWith({
            fromBankId: 1,
            toBankId: 2,
            amount: 25000,
            note: undefined,
        })
        expect(wrapper.emitted('saved')).toHaveLength(1)
        expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    })

    it('mantiene abierto el formulario y muestra el error cuando el guardado falla', async () => {
        apiMocks.createBankTransfer.mockRejectedValueOnce(new Error('Movimiento rechazado'))
        const wrapper = mountModal()
        await flushPromises()
        await openAndFillForm(wrapper)

        const submit = wrapper.findAll('button').find((button) => button.text() === 'Transferir')
        if (!submit) throw new Error('missing submit button')
        await submit.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Movimiento rechazado')
        expect(wrapper.emitted('saved')).toBeUndefined()
        expect(wrapper.findAll('button').some((button) => button.text() === 'Transferir')).toBe(true)
    })
})
