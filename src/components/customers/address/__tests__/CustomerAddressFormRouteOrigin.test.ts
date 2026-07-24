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
    customersStore: {
        neighborhoods: [] as any[],
        fetchNeighborhoods: vi.fn().mockResolvedValue(undefined),
        fetchAddressById: vi.fn(),
    },
    branchesStore: {
        current: null as any,
        list: null as any,
        currentNeighborhoods: [] as any[],
    },
    getBranchById: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
    useAuthStore: () => dependencies.authStore,
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

const modelValue = {
    neighborhoodId: 1,
    address: 'Cra 68 # 98-137',
    additionalInfo: '',
    latitude: 6.265,
    longitude: -75.57,
    isPrimary: true,
    deliveryFee: 5000,
}

const mountForm = (branchId: number) => mount(CustomerAddressForm, {
    props: {
        branchId,
        modelValue,
    },
    global: {
        stubs: {
            GoogleMapsSelector: GoogleMapsSelectorStub,
            NeighborhoodSearch: {
                props: ['modelValue'],
                template: '<div></div>',
            },
            BaseInput: BaseInputStub,
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
        dependencies.branchesStore.current = null
        dependencies.branchesStore.list = null
        dependencies.getBranchById.mockReset()
        dependencies.customersStore.fetchNeighborhoods.mockClear()
    })

    it('uses the authenticated branch coordinates without another request', async () => {
        const wrapper = mountForm(4)
        await openMap(wrapper)

        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toEqual({
            label: 'Castilla',
            lat: 6.2442,
            lng: -75.5812,
        })
        expect(dependencies.getBranchById).not.toHaveBeenCalled()
    })

    it('loads coordinates for the branch associated with another customer or order', async () => {
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Poblado',
                latitude: 6.2088,
                longitude: -75.5654,
            },
        })

        const wrapper = mountForm(9)
        await openMap(wrapper)

        expect(dependencies.getBranchById).toHaveBeenCalledWith(9)
        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toEqual({
            label: 'Poblado',
            lat: 6.2088,
            lng: -75.5654,
        })
    })

    it('passes null when the selected branch has no valid coordinates', async () => {
        dependencies.getBranchById.mockResolvedValue({
            data: {
                id: 9,
                name: 'Poblado',
                latitude: null,
                longitude: null,
            },
        })

        const wrapper = mountForm(9)
        await openMap(wrapper)

        expect(wrapper.getComponent(GoogleMapsSelectorStub).props('routeOrigin')).toBeNull()
    })
})
