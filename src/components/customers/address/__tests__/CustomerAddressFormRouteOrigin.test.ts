import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
    authStore: {
        branchId: 4 as number | null,
        user: {
            branchId: 4,
            branchName: 'Castilla',
            branchLatitude: 6.2442 as number | null,
            branchLongitude: -75.5812 as number | null,
        },
    },
    branchContext: {
        selectedBranchId: 4 as number | null,
    },
    customersStore: {
        neighborhoods: [] as any[],
        ensureNeighborhoodsLoaded: vi.fn().mockResolvedValue(undefined),
        fetchAddressById: vi.fn(),
    },
    branchesStore: {
        current: null as any,
        list: null as any,
        currentNeighborhoods: [] as any[],
    },
    getBranchById: vi.fn(),
    getBranchOptions: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
    useAuthStore: () => dependencies.authStore,
}))
vi.mock('@/store/branchContext', () => ({
    useBranchContextStore: () => dependencies.branchContext,
}))
vi.mock('@/store/customers', () => ({
    useCustomersStore: () => dependencies.customersStore,
}))
vi.mock('@/store/branches', () => ({
    useBranchesStore: () => dependencies.branchesStore,
}))
vi.mock('@/services/MainAPI/branchApi', () => ({
    branchApi: {
        getBranchById: dependencies.getBranchById,
        getBranchOptions: dependencies.getBranchOptions,
    },
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ error: vi.fn() }),
}))

import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'

const GoogleMapsSelectorStub = defineComponent({
    name: 'GoogleMapsSelector',
    props: ['modelValue', 'routeOrigin'],
    template: '<div data-testid="maps-selector"></div>',
})

const BaseInputStub = {
    props: ['modelValue', 'label'],
    emits: ['update:modelValue', 'blur', 'enter'],
    template: `
        <label>
            {{ label }}
            <input
                :data-label="label"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                @blur="$emit('blur')"
            />
        </label>
    `,
}

const BaseSelectStub = {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: `
        <select data-testid="branch-select" :value="modelValue ?? ''"
            @change="$emit('update:modelValue', Number($event.target.value))">
            <option value=""></option>
            <option v-for="option in options" :key="option.id" :value="option.id">{{ option.name }}</option>
        </select>
    `,
}

const modelValue = {
    neighborhoodId: 1,
    address: 'Cra 68 # 98-137',
    additionalInfo: '',
    latitude: 6.265,
    longitude: -75.57,
    isPrimary: true,
    deliveryFee: 5000,
}

const mountForm = (branchId: number, extraProps: Record<string, unknown> = {}) => mount(CustomerAddressForm, {
    props: {
        branchId,
        modelValue,
        ...extraProps,
    },
    global: {
        stubs: {
            GoogleMapsSelector: GoogleMapsSelectorStub,
            NeighborhoodSearch: {
                name: 'NeighborhoodSearch',
                props: ['modelValue', 'branchId', 'forOrderAddress'],
                template: '<div></div>',
            },
            BaseInput: BaseInputStub,
            BaseSelect: BaseSelectStub,
            BaseButton: {
                template: '<button><slot /></button>',
            },
        },
    },
})

const openMap = async (wrapper: ReturnType<typeof mountForm>) => {
    await wrapper.get('input[data-label="Dirección"]').trigger('blur')
    await flushPromises()
}

describe('CustomerAddressForm route origin', () => {
    beforeEach(() => {
        dependencies.authStore.branchId = 4
        dependencies.authStore.user = {
            branchId: 4,
            branchName: 'Castilla',
            branchLatitude: 6.2442,
            branchLongitude: -75.5812,
        }
        dependencies.branchContext.selectedBranchId = 4
        dependencies.branchesStore.current = null
        dependencies.branchesStore.list = null
        dependencies.getBranchById.mockReset()
        dependencies.getBranchOptions.mockReset().mockResolvedValue({
            data: [
                { id: 4, name: 'Castilla' },
                { id: 9, name: 'Manrique' },
                { id: 10, name: 'Laureles' },
            ],
        })
        dependencies.customersStore.ensureNeighborhoodsLoaded.mockClear()
    })

    it('uses the active POS branch even when the customer belongs to another branch', async () => {
        const wrapper = mountForm(9)
        await openMap(wrapper)

        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toEqual({
            label: 'Castilla',
            lat: 6.2442,
            lng: -75.5812,
        })
        expect(dependencies.getBranchById).not.toHaveBeenCalled()
    })

    it('loads coordinates for the branch currently selected in the POS', async () => {
        dependencies.branchContext.selectedBranchId = 9
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Manrique',
                latitude: 6.278,
                longitude: -75.553,
            },
        })

        const wrapper = mountForm(4)
        await openMap(wrapper)

        expect(dependencies.getBranchById).toHaveBeenCalledWith(9, false)
        expect((wrapper.vm as any).routeOrigin).toEqual({
            label: 'Manrique',
            lat: 6.278,
            lng: -75.553,
        })
    })

    it('falls back to the authenticated branch when there is no selected POS branch', async () => {
        dependencies.branchContext.selectedBranchId = null

        const wrapper = mountForm(9)
        await openMap(wrapper)

        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toEqual({
            label: 'Castilla',
            lat: 6.2442,
            lng: -75.5812,
        })
        expect(dependencies.getBranchById).not.toHaveBeenCalled()
    })

    it('passes null when the active branch has no valid coordinates', async () => {
        dependencies.branchContext.selectedBranchId = 9
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Manrique',
                latitude: null,
                longitude: null,
            },
        })

        const wrapper = mountForm(4)
        await openMap(wrapper)

        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toBeNull()
    })

    it('loads neighborhoods and route origin from the explicitly selected service branch', async () => {
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Manrique',
                latitude: 6.278,
                longitude: -75.553,
            },
        })

        const wrapper = mountForm(4, {
            defaultServiceBranchId: 4,
            allowBranchSelection: true,
        })
        await flushPromises()

        await wrapper.get('input[type="checkbox"]').setValue(true)
        await wrapper.get('[data-testid="branch-select"]').setValue('9')
        await flushPromises()

        expect(wrapper.getComponent({ name: 'NeighborhoodSearch' }).props('branchId')).toBe(9)
        expect(wrapper.getComponent({ name: 'NeighborhoodSearch' }).props('forOrderAddress')).toBe(true)
        expect(dependencies.getBranchById).toHaveBeenCalledWith(9, true)
        expect((wrapper.vm as any).routeOrigin).toEqual({
            label: 'Manrique',
            lat: 6.278,
            lng: -75.553,
        })
    })

    it('automatically selects the only alternative branch and restores the local branch when unchecked', async () => {
        dependencies.getBranchOptions.mockResolvedValue({
            data: [
                { id: 4, name: 'Castilla' },
                { id: 9, name: 'Manrique' },
            ],
        })
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Manrique',
                latitude: 6.278,
                longitude: -75.553,
            },
        })

        const wrapper = mountForm(4, {
            defaultServiceBranchId: 4,
            allowBranchSelection: true,
        })
        await flushPromises()

        const checkbox = wrapper.get('input[type="checkbox"]')
        await checkbox.setValue(true)
        await flushPromises()

        expect(wrapper.find('[data-testid="branch-select"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('Se atenderá desde Manrique')
        expect((wrapper.vm as any).effectiveServiceBranchId).toBe(9)
        expect(wrapper.getComponent({ name: 'NeighborhoodSearch' }).props('branchId')).toBe(9)
        expect((wrapper.emitted('update:modelValue')?.at(-1)?.[0] as any).serviceBranchId).toBe(9)

        await checkbox.setValue(false)
        await flushPromises()

        expect((wrapper.vm as any).effectiveServiceBranchId).toBe(4)
        expect(wrapper.getComponent({ name: 'NeighborhoodSearch' }).props('branchId')).toBe(4)
        expect((wrapper.emitted('update:modelValue')?.at(-1)?.[0] as any).serviceBranchId).toBe(4)
    })

    it('uses the selected remote order branch without exposing a second branch selector', async () => {
        dependencies.getBranchById.mockResolvedValue({
            data: { id: 10, name: 'Laureles', latitude: 6.25, longitude: -75.60 },
        })
        const wrapper = mountForm(4, {
            defaultServiceBranchId: 10,
            allowBranchSelection: false,
            forOrderAddress: true,
        })
        await openMap(wrapper)

        expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true) // primary address only
        expect(wrapper.find('[data-testid="branch-select"]').exists()).toBe(false)
        expect(wrapper.getComponent({ name: 'NeighborhoodSearch' }).props()).toMatchObject({
            branchId: 10,
            forOrderAddress: true,
        })
        expect(dependencies.getBranchById).toHaveBeenCalledWith(10, true)
    })

    it('keeps remote mode open while one of several alternative branches is being chosen', async () => {
        const wrapper = mountForm(4, {
            defaultServiceBranchId: 4,
            allowBranchSelection: true,
        })
        await flushPromises()

        await wrapper.get('input[type="checkbox"]').setValue(true)
        await flushPromises()

        expect(wrapper.find('[data-testid="branch-select"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('Selecciona primero la sucursal')
        expect((wrapper.vm as any).effectiveServiceBranchId).toBeNull()

        const echoedModel = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as typeof modelValue
        await wrapper.setProps({ modelValue: echoedModel })
        await flushPromises()

        expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
        expect(wrapper.find('[data-testid="branch-select"]').exists()).toBe(true)
    })

    it('keeps the remote branch selected when the parent echoes the form v-model', async () => {
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Manrique',
                latitude: 6.278,
                longitude: -75.553,
            },
        })

        const wrapper = mountForm(4, {
            defaultServiceBranchId: 4,
            allowBranchSelection: true,
        })
        await flushPromises()

        await wrapper.get('input[type="checkbox"]').setValue(true)
        await wrapper.get('[data-testid="branch-select"]').setValue('9')
        await flushPromises()

        const updates = wrapper.emitted('update:modelValue') ?? []
        const latestModel = updates.at(-1)?.[0] as typeof modelValue & { serviceBranchId?: number }
        expect(latestModel.serviceBranchId).toBe(9)

        // Reproduce el ciclo real de v-model del padre que antes desmarcaba el checkbox.
        await wrapper.setProps({ modelValue: { ...latestModel, neighborhoodId: 22 } })
        await flushPromises()

        expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
        expect((wrapper.get('[data-testid="branch-select"]').element as HTMLSelectElement).value).toBe('9')
        expect((wrapper.vm as any).effectiveServiceBranchId).toBe(9)
    })
})
