<template>
    <div v-if="workspaceBranchId" class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
        data-test="order-fulfillment-branch">
        <div v-if="loading" class="text-xs text-gray-500">Cargando sucursales...</div>
        <div v-else-if="loadError" class="text-sm text-red-700" role="alert">
            {{ loadError }}
            <button type="button" class="ml-2 underline" @click="loadBranches">Reintentar</button>
        </div>
        <template v-else-if="otherBranches.length">
            <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" :checked="alternativeEnabled" :disabled="changingBranch"
                    class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    data-test="remote-branch-toggle" @change="onToggle" />
                Atender desde otra sucursal
            </label>
            <div v-if="alternativeEnabled" class="mt-3">
                <BaseSelect :model-value="selectedRemoteBranchId" :options="otherBranches"
                    label="Sucursal que prepara y entrega" size="sm" value-key="id" display-key="name"
                    placeholder="Selecciona la sucursal" :disabled="changingBranch"
                    @update:model-value="selectBranch" />
                <p class="mt-2 text-xs text-gray-600">
                    Los pagos y el despacho corresponden a la sucursal que atiende el pedido.
                </p>
                <p v-if="hasPayments" class="mt-1 text-xs text-amber-700">
                    Cambiar de sucursal reinicia los pagos y beneficios de este borrador.
                </p>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useToast } from '@/composables/useToast'
import type { DraftOrder } from '@/types/order'
import type { BranchOption } from '@/store/branchContext'

const props = defineProps<{ order: DraftOrder }>()
const drafts = useOrdersDraftsStore()
const { error: showError, warning } = useToast()

const branches = ref<BranchOption[]>([])
const loading = ref(false)
const loadError = ref('')
const changingBranch = ref(false)
const alternativeEnabled = ref(false)
let loadVersion = 0

const workspaceBranchId = computed(() => props.order.workspaceBranchId ?? drafts.activeBranchId)
const otherBranches = computed(() => branches.value.filter(branch => branch.id !== workspaceBranchId.value))
const isRemote = computed(() => props.order.branchId != null
    && props.order.branchId !== workspaceBranchId.value)
const selectedRemoteBranchId = computed(() => isRemote.value ? props.order.branchId : null)
const hasPayments = computed(() => props.order.bankPayments.length > 0
    || props.order.appPayment != null || props.order.paidInStoreCash === true)

watch(() => [props.order.tabId, props.order.branchId, workspaceBranchId.value], () => {
    // El estado persistido del borrador es la fuente de verdad, no el checkbox.
    alternativeEnabled.value = isRemote.value
}, { immediate: true })

async function loadBranches() {
    const version = ++loadVersion
    loading.value = true
    loadError.value = ''
    try {
        const response = await branchApi.getBranchOptions()
        if (version !== loadVersion) return
        branches.value = response.data ?? []
        if (!branches.value.some(branch => branch.id === workspaceBranchId.value)) {
            throw new Error('La sucursal actual no está disponible.')
        }
        if (isRemote.value && !branches.value.some(branch => branch.id === props.order.branchId)) {
            throw new Error('La sucursal de destino ya no está activa.')
        }
    } catch (cause: unknown) {
        if (version !== loadVersion) return
        loadError.value = cause instanceof Error ? cause.message : 'No se pudieron consultar las sucursales.'
        branches.value = []
    } finally {
        if (version === loadVersion) loading.value = false
    }
}
onMounted(() => { void loadBranches() })

async function applyBranch(branchId: number) {
    if (changingBranch.value || !Number.isSafeInteger(branchId)
        || !branches.value.some(branch => branch.id === branchId)) return
    if (props.order.branchId === branchId) return

    const tabId = props.order.tabId
    const hadAddress = props.order.addressId != null
    const hadPayments = hasPayments.value
    changingBranch.value = true
    try {
        // Cambia solamente el borrador; no se cambia la sede de la sesión.
        const changed = await drafts.changeOperationalBranch(branchId)
        if (!changed) throw new Error('No fue posible cambiar la sucursal del pedido.')
        if (drafts.currentOrder?.tabId === tabId) {
            const current = drafts.currentOrder
            if (hadAddress && current.addressId == null && current.type !== 'onsite') {
                warning('Dirección pendiente', 'Elige una dirección con cobertura en la nueva sucursal.')
            }
            if (hadPayments) {
                warning('Pagos reiniciados', 'Selecciona los medios de pago de la sucursal que atenderá el pedido.')
            }
        }
    } catch (cause: unknown) {
        showError('Error al cambiar sucursal', cause instanceof Error ? cause.message : 'Intenta nuevamente.')
        alternativeEnabled.value = isRemote.value
    } finally {
        changingBranch.value = false
    }
}

async function onToggle(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked
    if (!enabled) {
        if (isRemote.value && workspaceBranchId.value) {
            await applyBranch(workspaceBranchId.value)
        }
        alternativeEnabled.value = isRemote.value
        return
    }
    alternativeEnabled.value = true
    if (otherBranches.value.length === 1) await applyBranch(otherBranches.value[0].id)
}

async function selectBranch(value: number | null) {
    if (value != null) await applyBranch(Number(value))
}
</script>
