<template>
    <div class="base-radio-group" :class="{ 'w-full': fullWidth }">
        <label v-if="label" class="block text-sm font-medium text-gray-700 mb-2">
            {{ label }}
            <span v-if="required" class="text-red-500">*</span>
        </label>

        <div class="inline-flex" :class="{ 'w-full': fullWidth }" role="radiogroup" :aria-label="label || name">
            <label v-for="(option, index) in options" :key="option.value" class="relative flex items-center" :class="[
                getLabelClasses(index),
                { 'flex-1': fullWidth }
            ]">
                <!-- Hidden native radio input for accessibility -->
                <input type="radio" :name="name" :value="option.value" :checked="modelValue === option.value"
                    :disabled="disabled" @change="handleChange(option.value)"
                    class="sr-only focus:ring-2 focus:ring-emerald-500" />

                <!-- Visual button -->
                <span :class="getButtonClasses(option.value, index)"
                    class="flex items-center justify-center cursor-pointer transition-all duration-200"
                    :style="{ width: fullWidth ? '100%' : 'auto' }">
                    {{ option.label }}
                </span>
            </label>
        </div>

        <!-- Error Message -->
        <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">


interface Option {
    value: string | number
    label: string
}

interface Props {
    modelValue: string | number | null
    options: Option[]
    name: string
    label?: string
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    fullWidth?: boolean
    required?: boolean
    error?: string
}

const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    disabled: false,
    fullWidth: false,
    required: false
})

const emit = defineEmits<{
    'update:modelValue': [value: string | number]
}>()

const getLabelClasses = (index: number) => {
    const classes = []

    // First item - rounded left
    if (index === 0) {
        classes.push('rounded-l-lg')
    }

    // Last item - rounded right
    if (index === props.options.length - 1) {
        classes.push('rounded-r-lg')
    }

    // Add negative margin to overlap borders (except first item)
    if (index > 0) {
        classes.push('-ml-px')
    }

    return classes
}

const getButtonClasses = (value: string | number, index: number) => {
    const isSelected = props.modelValue === value
    const base = 'border font-medium whitespace-nowrap'

    // Size classes
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    }

    // State classes
    let stateClasses = ''
    if (props.disabled) {
        stateClasses = 'opacity-50 cursor-not-allowed bg-gray-100'
    } else if (isSelected) {
        stateClasses = 'bg-emerald-600 border-emerald-600 text-white z-10'
    } else {
        stateClasses = 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
    }

    // Border radius classes
    let roundedClasses = ''
    if (index === 0) {
        roundedClasses = 'rounded-l-lg'
    }
    if (index === props.options.length - 1) {
        roundedClasses = 'rounded-r-lg'
    }

    return `${base} ${sizes[props.size]} ${stateClasses} ${roundedClasses}`
}

const handleChange = (value: string | number) => {
    if (!props.disabled) {
        emit('update:modelValue', value)
    }
}
</script>

<style scoped>
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
</style>
