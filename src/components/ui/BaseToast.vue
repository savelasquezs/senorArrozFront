<template>
    <transition name="fade">
        <div v-if="modelValue" :class="wrapperClass" class="fixed z-50 bottom-4 right-4 max-w-sm shadow-lg">
            <div :class="bodyClass" class="p-3 rounded-md text-sm flex items-start gap-2">
                <slot>
                    {{ message }}
                </slot>
                <button class="ml-auto opacity-70 hover:opacity-100"
                    @click="$emit('update:modelValue', false)">✕</button>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'

interface Props {
    modelValue: boolean
    message?: string
    type?: 'error' | 'success' | 'info' | 'warning'
    duration?: number
}

const props = withDefaults(defineProps<Props>(), {
    message: '',
    type: 'info',
    duration: 3000
})

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

let timer: any
const startTimer = () => {
    clearTimeout(timer)
    if (props.duration && props.modelValue) {
        timer = setTimeout(() => emit('update:modelValue', false), props.duration)
    }
}

watch(() => props.modelValue, () => startTimer(), { immediate: true })

const wrapperClass = ''
const bodyClass = computed(() => {
    switch (props.type) {
        case 'error':
            return 'bg-red-100 text-red-700'
        case 'success':
            return 'bg-green-100 text-green-700'
        case 'warning':
            return 'bg-yellow-100 text-yellow-700'
        default:
            return 'bg-blue-100 text-blue-700'
    }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
