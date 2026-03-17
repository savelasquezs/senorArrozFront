<template>
    <BaseInput
        :model-value="modelValue"
        :type="showPassword ? 'text' : 'password'"
        :label="label"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :error="error"
        :hint="hint"
        :minlength="minlength"
        :maxlength="maxlength"
        @update:model-value="$emit('update:modelValue', $event as string)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
    >
        <template #icon>
            <LockClosedIcon class="h-5 w-5 text-gray-400" />
        </template>
        <template #append>
            <BaseButton variant="ghost" size="sm" type="button" @click="showPassword = !showPassword">
                <EyeIcon v-if="showPassword" class="h-5 w-5 text-gray-400" />
                <EyeSlashIcon v-else class="h-5 w-5 text-gray-400" />
            </BaseButton>
        </template>
    </BaseInput>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from './BaseInput.vue'
import BaseButton from './BaseButton.vue'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

withDefaults(defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    error?: string
    hint?: string
    minlength?: number
    maxlength?: number
}>(), {
    required: false,
    disabled: false,
})

defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'blur', event: FocusEvent): void
    (e: 'focus', event: FocusEvent): void
}>()

const showPassword = ref(false)
</script>
