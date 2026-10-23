<template>
    <BaseDialog :model-value="modelValue" :title="title" size="2xl" :dismissible="!saving"
        :close-on-backdrop="false" :initial-focus="`#${inputId}`" @update:model-value="emit('update:modelValue', $event)">
        <label :for="inputId" class="mb-2 block text-sm font-medium text-gray-700">{{ label }}</label>
        <textarea :id="inputId" v-model="draft" rows="9"
            class="block min-h-52 max-h-[50dvh] w-full resize-y rounded-xl border border-gray-300 bg-gray-50/60 p-4 text-base leading-relaxed text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            placeholder="Escribe las indicaciones…" :disabled="saving || disabled" :aria-invalid="!!saveError" />
        <p v-if="disabled && !saving" role="alert" class="mt-3 text-sm text-amber-800">El pedido cambió o ya no permite editar. Cierra este editor y actualiza el pedido antes de guardar.</p>
        <p v-if="saveError" role="alert" class="mt-3 text-sm text-red-600">{{ saveError }}</p>
        <template #footer>
            <BaseButton variant="secondary" :disabled="saving" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="saving" :disabled="disabled" @click="saveNote">Guardar notas</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = withDefaults(defineProps<{
    modelValue: boolean
    notes?: string | null
    title?: string
    label?: string
    disabled?: boolean
    save: (notes: string) => void | Promise<void>
}>(), {
    title: 'Notas del producto',
    label: 'Indicaciones para preparar este producto',
})
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const inputId = `order-note-${useId()}`
const draft = ref('')
const saving = ref(false)
const saveError = ref('')

watch(() => props.modelValue, open => {
    if (open) {
        draft.value = props.notes ?? ''
        saveError.value = ''
    }
}, { immediate: true })

async function saveNote() {
    if (saving.value || props.disabled) return
    saving.value = true
    saveError.value = ''
    try {
        if (draft.value !== (props.notes ?? '')) await props.save(draft.value)
        emit('update:modelValue', false)
    } catch (err: unknown) {
        saveError.value = err instanceof Error ? err.message : 'No se pudieron guardar las notas. Intenta nuevamente.'
    } finally {
        saving.value = false
    }
}
</script>
