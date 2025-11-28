<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'" size="md">
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <BaseInput v-model="formData.name" label="Nombre" placeholder="Nombre del proveedor" required
                :disabled="loading" />

            <BaseInput v-model="formData.phone" label="Teléfono" placeholder="Teléfono de contacto" required
                :disabled="loading" />

            <BaseInput v-model="formData.address" label="Dirección" placeholder="Dirección (opcional)"
                :disabled="loading" />

            <BaseInput v-model="formData.email" label="Email" type="email" placeholder="Correo electrónico (opcional)"
                :disabled="loading" />

            <div class="flex justify-end space-x-3 pt-4">
                <BaseButton type="button" variant="outline" @click="$emit('close')" :disabled="loading">
                    Cancelar
                </BaseButton>
                <BaseButton type="submit" variant="primary" :loading="loading">
                    {{ editingSupplier ? 'Actualizar' : 'Crear' }}
                </BaseButton>
            </div>
        </form>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Supplier, CreateSupplierDto } from '@/types/supplier'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
    isOpen: boolean
    editingSupplier?: Supplier | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    editingSupplier: null,
    loading: false
})

const emit = defineEmits<{
    close: []
    submit: [data: CreateSupplierDto]
}>()

interface SupplierFormState {
    name: string
    phone: string
    address: string
    email: string
}

const formData = ref<SupplierFormState>({
    name: '',
    phone: '',
    address: '',
    email: ''
})

watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        if (props.editingSupplier) {
            formData.value = {
                name: props.editingSupplier.name,
                phone: props.editingSupplier.phone,
                address: props.editingSupplier.address ?? '',
                email: props.editingSupplier.email ?? ''
            }
        } else {
            formData.value = {
                name: '',
                phone: '',
                address: '',
                email: ''
            }
        }
    }
})

const handleSubmit = () => {
    const name = formData.value.name.trim()
    const phone = formData.value.phone.trim()
    const address = formData.value.address.trim()
    const email = formData.value.email.trim()

    if (!name || !phone) {
        return
    }

    const payload: CreateSupplierDto = {
        name,
        phone
    }

    if (address) payload.address = address
    if (email) payload.email = email

    emit('submit', payload)
}
</script>
