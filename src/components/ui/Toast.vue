<template>
    <transition name="toast-slide">
        <div v-if="isVisible" :class="toastClasses"
            class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <component :is="iconComponent" :class="iconClasses" class="h-5 w-5" />
                    </div>
                    <div class="ml-3 w-0 flex-1 pt-0.5">
                        <p class="text-sm font-medium text-gray-900">{{ toast.title }}</p>
                        <p v-if="toast.message" class="mt-1 text-sm text-gray-500">{{ toast.message }}</p>
                        <div v-if="toast.actions" class="mt-3 flex space-x-2">
                            <button v-for="action in toast.actions" :key="action.label" @click="action.action"
                                class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                {{ action.label }}
                            </button>
                        </div>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button @click="$emit('close')"
                            class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <span class="sr-only">Cerrar</span>
                            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Toast } from '@/composables/useToast'

interface Props {
    toast: Toast
}

const props = defineProps<Props>()
 defineEmits<{
    close: []
}>()

const isVisible = ref(false)

onMounted(() => {
    isVisible.value = true
})

const toastClasses = computed(() => {
    switch (props.toast.variant) {
        case 'success':
            return 'border-l-4 border-green-400'
        case 'error':
            return 'border-l-4 border-red-400'
        case 'warning':
            return 'border-l-4 border-yellow-400'
        case 'info':
            return 'border-l-4 border-blue-400'
        default:
            return 'border-l-4 border-gray-400'
    }
})

const iconClasses = computed(() => {
    switch (props.toast.variant) {
        case 'success':
            return 'text-green-400'
        case 'error':
            return 'text-red-400'
        case 'warning':
            return 'text-yellow-400'
        case 'info':
            return 'text-blue-400'
        default:
            return 'text-gray-400'
    }
})

const iconComponent = computed(() => {
    switch (props.toast.variant) {
        case 'success':
            return 'svg'
        case 'error':
            return 'svg'
        case 'warning':
            return 'svg'
        case 'info':
            return 'svg'
        default:
            return 'svg'
    }
})
</script>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: all 0.3s ease;
}

.toast-slide-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-slide-leave-to {
    opacity: 0;
    transform: translateX(100%);
}
</style>
