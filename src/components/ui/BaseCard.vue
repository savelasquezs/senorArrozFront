<template>
    <div :class="cardClasses">
        <div v-if="$slots.header || title" class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div v-if="$slots.header">
                <slot name="header" />
            </div>
            <div v-else-if="title" class="flex items-center justify-between">
                <h3 class="text-lg leading-6 font-medium text-gray-900">{{ title }}</h3>
                <div v-if="$slots.actions">
                    <slot name="actions" />
                </div>
            </div>
        </div>

        <div :class="bodyClasses">
            <slot />
        </div>

        <div v-if="$slots.footer" class="px-4 py-4 border-t border-gray-200 sm:px-6">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
    title?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    shadow?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
    padding: 'md',
    shadow: 'sm'
})

const cardClasses = computed(() => {
    const base = 'bg-white rounded-lg border border-gray-200'

    const shadows = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg'
    }

    return `${base} ${shadows[props.shadow]}`
})

const bodyClasses = computed(() => {
    const paddings = {
        none: '',
        sm: 'p-2',
        md: 'p-4',
        lg: 'p-6'
    }

    return paddings[props.padding]
})
</script>