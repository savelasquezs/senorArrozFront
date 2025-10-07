<template>
    <BaseDialog :model-value="show" @update:model-value="handleModalClose" size="xl">
        <div style="padding: 20px; background: green; color: white;">
            <h2>SIMPLIFIED MODAL</h2>
            <p>Customer: {{ customer?.name || 'No customer' }}</p>
            <p>Show: {{ show }}</p>
            <button @click="handleClose" style="background: white; color: black; padding: 10px;">
                Close
            </button>
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import type { Customer } from '@/types/customer'
import BaseDialog from '@/components/ui/BaseDialog.vue'

interface Props {
    show: boolean
    customer?: Customer
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const handleClose = () => {
    emit('close')
}

const handleModalClose = (value: boolean) => {
    if (!value) {
        handleClose()
    }
}
</script>
