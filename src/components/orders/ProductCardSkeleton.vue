<template>
    <div class="product-card-skeleton" :class="cardClasses">
        <!-- Image Skeleton -->
        <div class="aspect-square bg-gray-200 rounded-t-lg animate-pulse">
            <div class="w-full h-full bg-gray-300 rounded-t-lg"></div>
        </div>

        <!-- Content Skeleton -->
        <div class="p-4 space-y-3">
            <!-- Product Name -->
            <div class="h-4 bg-gray-300 rounded animate-pulse"></div>
            <div class="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>

            <!-- Category Badge (only in default variant) -->
            <div v-if="variant === 'default'" class="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>

            <!-- Price -->
            <div class="h-6 bg-gray-300 rounded w-16 animate-pulse"></div>

            <!-- Stock Info (only in default variant) -->
            <div v-if="variant === 'default'" class="flex items-center justify-between">
                <div class="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                <div class="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>

            <!-- Button -->
            <div class="h-8 bg-gray-300 rounded animate-pulse"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
    variant?: 'default' | 'compact' | 'featured'
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default'
})

// Computed
const cardClasses = computed(() => {
    const classes = ['bg-white', 'rounded-lg', 'shadow-sm', 'border', 'border-gray-200']

    switch (props.variant) {
        case 'compact':
            classes.push('p-2')
            break
        case 'featured':
            classes.push('ring-2', 'ring-gray-300', 'ring-opacity-50')
            break
        default:
            classes.push('p-4')
    }

    return classes.join(' ')
})
</script>

<style scoped>
.product-card-skeleton {
    position: relative;
    overflow: hidden;
}

/* Skeleton animation */
@keyframes shimmer {
    0% {
        background-position: -200px 0;
    }

    100% {
        background-position: calc(200px + 100%) 0;
    }
}

.animate-pulse {
    animation: shimmer 1.5s ease-in-out infinite;
    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
    background-size: 200px 100%;
}
</style>
