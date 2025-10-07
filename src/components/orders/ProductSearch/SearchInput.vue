<template>
    <div class="relative">
        <BaseInput :model-value="modelValue" :placeholder="placeholder" :icon="MagnifyingGlassIcon" class="w-full"
            @update:model-value="handleModelValueUpdate" @focus="handleFocus" @blur="handleBlur">
            <template #append v-if="modelValue">
                <button @click="handleClear" class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    type="button">
                    <XMarkIcon class="w-4 h-4" />
                </button>
            </template>
        </BaseInput>

        <!-- Suggestions Dropdown -->
        <div v-if="showSuggestions && suggestions.length > 0"
            class="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div v-for="product in suggestions" :key="product.id" @click="handleSuggestionClick(product)"
                class="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-900">{{ product.name }}</span>
                    <span class="text-sm text-gray-500">{{ formatCurrency(product.price) }}</span>
                </div>
                <div class="text-xs text-gray-400 mt-1">{{ product.categoryName }}</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useFormatting } from '@/composables/useFormatting'
import type { Product } from '@/types/product'

interface Props {
    modelValue: string
    placeholder?: string
    suggestions: Product[]
    showSuggestions: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Buscar productos...'
})

const emit = defineEmits<{
    'update:modelValue': [value: string]
    'focus': []
    'blur': []
    'clear': []
    'suggestion-selected': [product: Product]
}>()

const { formatCurrency } = useFormatting()

const handleModelValueUpdate = (value: string | number | null) => {
    emit('update:modelValue', String(value || ''))
}

const handleFocus = () => {
    emit('focus')
}

const handleBlur = () => {
    emit('blur')
}

const handleClear = () => {
    emit('update:modelValue', '')
    emit('clear')
}

const handleSuggestionClick = (product: Product) => {
    emit('suggestion-selected', product)
}
</script>
