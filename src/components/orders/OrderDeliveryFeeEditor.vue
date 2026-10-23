<template>
    <div class="min-w-0" :aria-busy="saving">
        <div v-if="!editing" class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-medium text-gray-600">Domicilio</span>
            <div class="flex items-center gap-3">
                <span class="text-sm font-semibold tabular-nums text-gray-900">{{ formatCurrency(deliveryFee) }}</span>
                <BaseButton v-if="canEdit" ref="editButton" size="sm" variant="ghost" :disabled="disabled"
                    aria-label="Editar tarifa de domicilio" @click="startEditing">
                    <PencilIcon class="h-4 w-4" aria-hidden="true" />
                    Editar tarifa
                </BaseButton>
            </div>
        </div>
        <div v-else class="space-y-3 rounded-xl border border-emerald-200 bg-white p-3 sm:p-4">
            <div class="flex flex-wrap items-center justify-between gap-1">
                <label :for="inputId" class="text-sm font-semibold text-gray-900">Tarifa de domicilio</label>
                <span class="text-xs text-gray-500">Actual: {{ formatCurrency(deliveryFee) }}</span>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div class="min-w-0 flex-1">
                    <div class="relative">
                        <span class="pointer-events-none absolute left-3 top-2.5 text-sm text-gray-500" aria-hidden="true">$</span>
                        <input :id="inputId" ref="input" v-model="draft" type="number" inputmode="numeric"
                            min="0" :max="MAX_ORDER_DELIVERY_FEE" step="1" :disabled="saving || disabled"
                            :aria-invalid="!!validationError" :aria-describedby="`${inputId}-help`"
                            class="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
                            @keydown.enter.prevent="save" @keydown.esc.stop.prevent="cancel" />
                    </div>
                    <p :id="`${inputId}-help`" class="mt-1.5 text-xs" :class="validationError ? 'text-red-600' : 'text-gray-500'">
                        {{ validationError || 'Valor en COP. Puedes ingresar 0. Solo se modifica este pedido.' }}
                    </p>
                </div>
                <div class="flex gap-2 sm:shrink-0">
                    <BaseButton size="sm" variant="secondary" class="min-h-11 flex-1 sm:flex-none"
                        :disabled="saving" @click="cancel">Cancelar</BaseButton>
                    <BaseButton size="sm" class="min-h-11 flex-1 sm:flex-none" :loading="saving" loading-text="Guardando…"
                        :disabled="disabled || !!validationError || Number(draft) === deliveryFee" @click="save">Guardar tarifa</BaseButton>
                </div>
            </div>
            <p v-if="!validationError && total != null" class="text-sm text-gray-600">
                Total al guardar: <strong class="tabular-nums text-gray-900">{{ formatCurrency(total - deliveryFee + Number(draft)) }}</strong>
            </p>
            <p v-if="error" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { PencilIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useFormatting } from '@/composables/useFormatting'
import { deliveryFeeValidationMessage, MAX_ORDER_DELIVERY_FEE } from '@/helpers/orderDeliveryFee'

const props = defineProps<{
    deliveryFee: number
    total?: number
    canEdit: boolean
    saving?: boolean
    disabled?: boolean
    error?: string
}>()
const emit = defineEmits<{ save: [value: number]; edit: [] }>()
const { formatCurrency } = useFormatting()
const inputId = useId()
const editing = ref(false)
const draft = ref<number | string>('')
const input = ref<HTMLInputElement | null>(null)
const editButton = ref<InstanceType<typeof BaseButton> | null>(null)
const validationError = computed(() => deliveryFeeValidationMessage(draft.value))

async function startEditing() {
    draft.value = props.deliveryFee
    editing.value = true
    emit('edit')
    await nextTick()
    input.value?.focus()
    input.value?.select()
}

async function cancel() {
    if (props.saving) return
    editing.value = false
    await nextTick()
    editButton.value?.$el?.focus()
}

function save() {
    if (props.saving || props.disabled || !props.canEdit || validationError.value || Number(draft.value) === props.deliveryFee) return
    emit('save', Number(draft.value))
}

watch(() => props.saving, (saving, wasSaving) => {
    if (wasSaving && !saving && !props.error) void cancel()
})
watch(() => props.canEdit, (allowed) => { if (!allowed) editing.value = false })
</script>
