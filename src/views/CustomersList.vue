<!-- src/views/CustomersList.vue -->
<template>
    <MainLayout page-title="Clientes">
        <BaseLoading v-if="store.isLoading && !store.list" text="Cargando clientes..." />

        <div v-else class="flex flex-col gap-2 min-h-0 -mx-2 sm:mx-0">
            <form
                class="flex flex-wrap items-end gap-x-3 gap-y-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-xs"
                @submit.prevent="runSearch">
                <BaseInput
                    v-model="filters.name"
                    placeholder="Nombre…"
                    class="min-w-[8rem] flex-1 sm:max-w-[11rem] [&_input]:py-1.5 [&_input]:text-xs"
                    @enter="runSearch">
                    <template #icon>
                        <MagnifyingGlassIcon class="w-4 h-4" />
                    </template>
                </BaseInput>
                <BaseInput
                    v-model="filters.phone"
                    placeholder="Teléfono…"
                    class="min-w-[8rem] flex-1 sm:max-w-[11rem] [&_input]:py-1.5 [&_input]:text-xs"
                    @enter="runSearch">
                    <template #icon>
                        <PhoneIcon class="w-4 h-4" />
                    </template>
                </BaseInput>
                <BaseSelect
                    v-model="filters.active"
                    :options="statusOptions"
                    placeholder="Estado"
                    value-key="value"
                    display-key="label"
                    class="min-w-[7.5rem] max-w-[11rem] [&_button]:py-1.5 [&_button]:text-xs" />
                <BaseSelect
                    v-if="auth.isSuperadmin"
                    v-model="filters.branchId"
                    :options="branchOptions"
                    placeholder="Sucursal"
                    value-key="value"
                    display-key="label"
                    class="min-w-[9rem] max-w-[13rem] [&_button]:py-1.5 [&_button]:text-xs" />
                <div class="flex flex-wrap gap-1.5">
                    <BaseButton type="submit" variant="primary" size="sm" :icon="MagnifyingGlassIcon">
                        Buscar
                    </BaseButton>
                    <BaseButton type="button" @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar
                    </BaseButton>
                </div>
                <div class="flex-1 min-w-[4rem]" />
                <BaseButton type="button" @click="openCreate" variant="primary" size="sm" :icon="PlusIcon">
                    Nuevo
                </BaseButton>
            </form>

            <div
                class="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-50/90 border border-gray-100 rounded-md">
                <span>
                    En esta página: <strong class="text-gray-900">{{ store.list?.items?.length ?? 0 }}</strong> · Total
                    con filtros:
                    <strong class="text-gray-900">{{ store.list?.totalCount ?? 0 }}</strong>
                </span>
                <span class="hidden sm:inline text-gray-300">|</span>
                <span>Activos <strong class="text-gray-900">{{ activeCustomers }}</strong> (en página)</span>
                <span>Inactivos <strong class="text-gray-900">{{ inactiveCustomers }}</strong></span>
                <span>Con direcciones <strong class="text-gray-900">{{ customersWithAddresses }}</strong></span>
            </div>

            <BaseCard class="p-0 overflow-hidden flex flex-col flex-1 min-h-0 border border-gray-200">
                <div class="overflow-auto max-h-[min(calc(100vh-13rem),72vh)]">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Cliente
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Contacto
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Sucursal
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Dir.
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">
                                    Pedidos
                                </th>
                                <th class="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Estado</th>
                                <th class="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-100">
                            <tr v-if="(store.list?.items?.length || 0) === 0">
                                <td colspan="7" class="px-3 py-10 text-center text-gray-500">
                                    <UserGroupIcon class="mx-auto h-8 w-8 text-gray-400" />
                                    <p class="mt-2 text-sm font-medium">Sin resultados</p>
                                    <p class="text-xs">Ajusta los filtros o busca de nuevo</p>
                                </td>
                            </tr>

                            <tr
                                v-for="customer in store.list?.items || []"
                                :key="customer.id"
                                class="hover:bg-gray-50/80 align-middle">
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <div class="flex items-center gap-2">
                                        <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <UserIcon class="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div class="min-w-0">
                                            <div class="font-medium text-gray-900 truncate max-w-[14rem]">
                                                {{ customer.name }}
                                            </div>
                                            <div class="text-[11px] text-gray-500">#{{ customer.id }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-800">
                                    <div class="flex items-center gap-0.5">
                                        <PhoneIcon class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        {{ customer.phone1 }}
                                    </div>
                                    <div v-if="customer.phone2" class="flex items-center gap-0.5 mt-0.5">
                                        <PhoneIcon class="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        {{ customer.phone2 }}
                                    </div>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-800 whitespace-nowrap">
                                    <span class="inline-flex items-center gap-0.5">
                                        <BuildingOffice2Icon class="h-3.5 w-3.5 text-gray-400" />
                                        {{ customer.branchName || getBranchName(customer.branchId) }}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-800 whitespace-nowrap tabular-nums">
                                    {{ customer.addresses?.length || 0 }}
                                </td>
                                <td class="px-3 py-2 text-xs text-gray-800 whitespace-nowrap">
                                    <span class="tabular-nums">{{ customer.totalOrders || 0 }}</span>
                                    <span v-if="(customer.totalOrders || 0) !== 1" class="text-gray-500"> pedidos</span>
                                    <span v-else class="text-gray-500"> pedido</span>
                                    <div v-if="customer.lastOrderDate" class="text-[10px] text-gray-500">
                                        Últ.: {{ formatDateShort(customer.lastOrderDate) }}
                                    </div>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap">
                                    <BaseBadge :variant="customer.active ? 'success' : 'danger'" class="text-[10px]">
                                        {{ customer.active ? 'Activo' : 'Inactivo' }}
                                    </BaseBadge>
                                </td>
                                <td class="px-3 py-2 whitespace-nowrap text-right">
                                    <div class="flex justify-end gap-1">
                                        <BaseButton
                                            variant="outline"
                                            size="sm"
                                            :icon="EyeIcon"
                                            title="Ver detalle"
                                            @click="openCustomerDetail(customer)" />
                                        <BaseButton
                                            variant="outline"
                                            size="sm"
                                            :icon="PencilIcon"
                                            title="Editar"
                                            @click="openEdit(customer)" />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div
                    v-if="store.list && store.list.totalPages > 1"
                    class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-white text-xs text-gray-600">
                    <span>
                        {{ ((store.list.page - 1) * store.list.pageSize) + 1 }}–{{
                            Math.min(store.list.page * store.list.pageSize, store.list.totalCount)
                        }}
                        de {{ store.list.totalCount }}
                    </span>
                    <div class="flex gap-1">
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasPreviousPage" @click="previousPage">
                            <ChevronLeftIcon class="w-4 h-4" />
                        </BaseButton>
                        <BaseButton size="sm" variant="outline" :disabled="!store.list.hasNextPage" @click="nextPage">
                            <ChevronRightIcon class="w-4 h-4" />
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>
        </div>

        <BaseDialog v-model="showForm" :title="editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'" :icon="PlusIcon" size="lg">
            <CustomerForm
                :customer="editingCustomer"
                :loading="formLoading"
                :can-select-branch="auth.isSuperadmin"
                @submit="handleFormSubmit"
                @cancel="showForm = false" />
        </BaseDialog>

        <CustomerDetailModal
            :show="detailModalOpen"
            :customer="detailCustomer ?? undefined"
            :loading="detailModalLoading"
            @close="closeCustomerDetail"
            @customer-updated="onCustomerUpdatedFromDetail" />
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useCustomersStore } from '@/store/customers'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useRoute, useRouter } from 'vue-router'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'

import {
    UserGroupIcon,
    UserIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon,
} from '@heroicons/vue/24/outline'

import type { Customer, CustomerFilters, CustomerFormData } from '@/types/customer'

const store = useCustomersStore()
const branchesStore = useBranchesStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { success, error: showError } = useToast()

const filters = ref({
    name: '',
    phone: '',
    active: undefined as boolean | undefined,
    branchId: undefined as number | undefined,
    page: 1,
    pageSize: 10,
})

const showForm = ref(false)
const editingCustomer = ref<Customer | null>(null)
const formLoading = ref(false)

const detailModalOpen = ref(false)
const detailModalLoading = ref(false)
const detailCustomer = ref<Customer | null>(null)

const statusOptions = [
    { value: undefined, label: 'Todos' },
    { value: true, label: 'Activos' },
    { value: false, label: 'Inactivos' },
]

const branchOptions = computed(() => {
    if (!branchesStore.list?.items) return []
    return [
        { value: undefined, label: 'Todas' },
        ...branchesStore.list.items.map(branch => ({
            value: branch.id,
            label: branch.name,
        })),
    ]
})

const activeCustomers = computed(() => store.list?.items?.filter(c => c.active).length || 0)
const inactiveCustomers = computed(() => store.list?.items?.filter(c => !c.active).length || 0)
const customersWithAddresses = computed(
    () => store.list?.items?.filter(c => c.addresses && c.addresses.length > 0).length || 0,
)

function getBranchName(branchId: number) {
    if (auth.isSuperadmin) {
        const branch = branchesStore.list?.items?.find(b => b.id === branchId)
        return branch?.name || '—'
    }
    if (branchesStore.current && branchesStore.current.id === branchId) {
        return branchesStore.current.name
    }
    return '—'
}

function formatDateShort(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function canAccessCustomerRow(customer: Customer | null): boolean {
    if (!customer) return false
    if (auth.isSuperadmin) return true
    const bid = auth.branchId
    if (bid == null) return false
    return bid === customer.branchId
}

function stripDetailQuery() {
    const q = { ...route.query } as Record<string, string | string[] | undefined>
    delete q.detail
    router.replace({ path: '/customers', query: q }).catch(() => {})
}

async function syncDetailFromRoute() {
    const raw = route.query.detail
    const q = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
    if (!q) {
        detailModalOpen.value = false
        detailCustomer.value = null
        return
    }
    const id = Number(q)
    if (!Number.isFinite(id) || id <= 0) {
        stripDetailQuery()
        return
    }

    if (detailCustomer.value?.id === id && detailModalOpen.value) {
        return
    }

    detailModalLoading.value = true
    try {
        await store.fetchById(id, { silent: true })
        const c = store.current
        if (!c || c.id !== id) {
            showError('Cliente', 'No se encontró el cliente')
            stripDetailQuery()
            return
        }
        if (!canAccessCustomerRow(c)) {
            showError('Acceso denegado', 'No tienes permiso para ver este cliente')
            stripDetailQuery()
            return
        }
        detailCustomer.value = c
        detailModalOpen.value = true
    } catch {
        showError('Error', 'No se pudo cargar el cliente')
        stripDetailQuery()
    } finally {
        detailModalLoading.value = false
    }
}

watch(
    () => route.query.detail,
    () => {
        void syncDetailFromRoute()
    },
    { immediate: true },
)

const load = async () => {
    try {
        const filtersToSend: CustomerFilters = {
            name: filters.value.name || undefined,
            phone: filters.value.phone || undefined,
            active: filters.value.active,
            branchId: auth.isSuperadmin ? filters.value.branchId : auth.branchId || undefined,
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10,
        }
        await store.fetch(filtersToSend)
    } catch {
        showError('Error al cargar', 'No se pudieron cargar los clientes')
    }
}

const runSearch = async () => {
    filters.value.page = 1
    await load()
}

const clearFilters = async () => {
    filters.value = {
        name: '',
        phone: '',
        active: undefined,
        branchId: auth.isSuperadmin ? undefined : auth.branchId || undefined,
        page: 1,
        pageSize: 10,
    }
    await load()
}

function openCustomerDetail(customer: Customer) {
    detailCustomer.value = customer
    detailModalOpen.value = true
    router
        .replace({
            path: '/customers',
            query: { ...route.query, detail: String(customer.id) },
        })
        .catch(() => {})
}

function closeCustomerDetail() {
    detailModalOpen.value = false
    detailCustomer.value = null
    stripDetailQuery()
}

async function onCustomerUpdatedFromDetail(updated: Customer) {
    detailCustomer.value = updated
    await load()
}

const openCreate = () => {
    editingCustomer.value = null
    showForm.value = true
}

const openEdit = (customer: Customer) => {
    editingCustomer.value = customer
    showForm.value = true
}

const handleFormSubmit = async (data: CustomerFormData) => {
    try {
        formLoading.value = true
        if (editingCustomer.value) {
            await store.update(editingCustomer.value.id, {
                name: data.name,
                phone1: data.phone1,
                phone2: data.phone2,
                active: data.active,
            })
            success('Cliente actualizado', 3000, `El cliente "${data.name}" se ha actualizado correctamente`)
        } else {
            await store.create({
                name: data.name,
                phone1: data.phone1,
                phone2: data.phone2,
                branchId: data.branchId,
                initialAddress: data.initialAddress
                    ? {
                          neighborhoodId: data.initialAddress.neighborhoodId,
                          address: data.initialAddress.address,
                          additionalInfo: data.initialAddress.additionalInfo,
                          latitude: data.initialAddress.latitude ?? 0,
                          longitude: data.initialAddress.longitude ?? 0,
                          isPrimary: data.initialAddress.isPrimary ?? true,
                          deliveryFee: data.initialAddress.deliveryFee,
                      }
                    : undefined,
            })
            success('Cliente creado', 3000, `El cliente "${data.name}" se ha creado correctamente`)
        }
        showForm.value = false
        await load()
    } catch {
        showError('Error al guardar', store.error || 'No se pudo guardar el cliente')
    } finally {
        formLoading.value = false
    }
}

const previousPage = async () => {
    if (store.list?.hasPreviousPage) {
        filters.value.page = (filters.value.page || 1) - 1
        await load()
    }
}

const nextPage = async () => {
    if (store.list?.hasNextPage) {
        filters.value.page = (filters.value.page || 1) + 1
        await load()
    }
}

onMounted(async () => {
    try {
        if (!auth.isSuperadmin && auth.branchId) {
            filters.value.branchId = auth.branchId
        }
        await load()
    } catch {
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>
