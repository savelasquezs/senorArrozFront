<template>
    <BaseDialog :model-value="open" title="Cambiar sucursal del pedido" size="md"
        :close-on-backdrop="!saving" @update:model-value="!$event && close()">
        <div class="space-y-4 text-sm text-gray-700">
            <p>
                El pedido <strong>#{{ order.id }}</strong> dejará de ser atendido por
                <strong>{{ order.branchName }}</strong>.
            </p>
            <label for="transfer-target-branch" class="block font-medium text-gray-900">Nueva sucursal</label>
            <select id="transfer-target-branch" v-model.number="targetBranchId"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                :disabled="saving">
                <option :value="null">Selecciona una sucursal</option>
                <option v-for="branch in availableBranches" :key="branch.id" :value="branch.id">
                    {{ branch.name }}
                </option>
            </select>
            <p v-if="!availableBranches.length" class="text-amber-700">
                No hay otra sucursal disponible.
            </p>
            <p class="rounded-lg bg-gray-50 p-3">
                Se cambia únicamente la sucursal que atiende el pedido. Se conservan el número,
                estado, pagos, productos, domiciliario, rutas e historial. No se modifica inventario.
                Los pagos, productos y rutas que ya estaban vinculados a la sede anterior
                conservarán esa vinculación.
            </p>
            <p v-if="failure" role="alert" class="text-red-700">{{ failure }}</p>
        </div>
        <template #footer>
            <BaseButton variant="secondary" :disabled="saving" @click="close">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="!canSubmit"
                @click="transfer">Confirmar traslado</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { orderApi } from '@/services/MainAPI/orderApi'
import { useBranchContextStore } from '@/store/branchContext'
import type { OrderDetailView } from '@/types/order'

const props = defineProps<{ open: boolean; order: OrderDetailView }>()
const emit = defineEmits<{ close: []; transferred: [targetBranchId: number] }>()
const branchContext = useBranchContextStore()
const targetBranchId = ref<number | null>(null)
const saving = ref(false)
const failure = ref('')
const availableBranches = computed(() =>
    branchContext.options.filter(branch => branch.id !== props.order.branchId))
const canSubmit = computed(() => !saving.value && targetBranchId.value != null &&
    availableBranches.value.some(branch => branch.id === targetBranchId.value))

watch(() => props.open, open => {
    if (open) {
        targetBranchId.value = null
        failure.value = ''
    }
})

function close() {
    if (!saving.value) emit('close')
}

async function transfer() {
    if (!canSubmit.value || targetBranchId.value == null) return
    saving.value = true
    failure.value = ''
    try {
        const target = targetBranchId.value
        await orderApi.transferBranch(props.order.id, target, props.order)
        emit('transferred', target)
    } catch (err: unknown) {
        failure.value = err instanceof Error ? err.message : 'No fue posible cambiar la sucursal.'
    } finally {
        saving.value = false
    }
}
</script>
