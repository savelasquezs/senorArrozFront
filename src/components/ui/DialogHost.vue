<template>
  <BaseDialog
    :model-value="Boolean(activeDialog)"
    :title="activeDialog?.options.title"
    :icon="dialogIcon"
    :icon-variant="iconVariant"
    size="sm"
    z-class="z-[11000]"
    panel-class="global-dialog-host-panel"
    :initial-focus="activeDialog?.type === 'prompt' ? 'input' : '[data-dialog-cancel]'"
    :focus-key="activeDialog?.id"
    @update:model-value="handleOpenChange"
  >
    <div v-if="activeDialog" class="space-y-4">
      <p class="whitespace-pre-line text-sm leading-6 text-gray-700">
        {{ activeDialog.options.message }}
      </p>

      <BaseInput
        v-if="activeDialog.type === 'prompt'"
        v-model="promptValue"
        :label="activeDialog.options.inputLabel"
        :placeholder="activeDialog.options.placeholder"
        :error="promptError"
        @enter="submitDialog"
      />
    </div>

    <template #footer>
      <BaseButton data-dialog-cancel variant="secondary" @click="cancelDialog">
        {{ activeDialog?.options.cancelLabel || 'Cancelar' }}
      </BaseButton>
      <BaseButton
        data-dialog-confirm
        :variant="confirmButtonVariant"
        @click="submitDialog"
      >
        {{ activeDialog?.options.confirmLabel || 'Confirmar' }}
      </BaseButton>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useDialog } from '@/composables/useDialog'

const { activeDialog, resolveDialog, cancelDialog } = useDialog()
const promptValue = ref('')
const promptError = ref('')

const tone = computed(() => activeDialog.value?.options.tone ?? 'default')
const dialogIcon = computed(() =>
  tone.value === 'default' ? QuestionMarkCircleIcon : ExclamationTriangleIcon,
)
const iconVariant = computed(() => {
  if (tone.value === 'danger') return 'danger' as const
  if (tone.value === 'warning') return 'warning' as const
  return 'primary' as const
})
const confirmButtonVariant = computed(() =>
  tone.value === 'danger' ? 'danger' as const : 'primary' as const,
)

function dialogPanel(): HTMLElement | null {
  return document.querySelector('.global-dialog-host-panel')
}

function focusInitialControl() {
  void nextTick(() => {
    const panel = dialogPanel()
    if (!panel) return
    const target = activeDialog.value?.type === 'prompt'
      ? panel.querySelector<HTMLElement>('input')
      : panel.querySelector<HTMLElement>('[data-dialog-cancel]')
    target?.focus()
  })
}

watch(
  () => activeDialog.value?.id,
  () => {
    promptError.value = ''
    promptValue.value = activeDialog.value?.type === 'prompt'
      ? activeDialog.value.options.defaultValue ?? ''
      : ''
  },
  { immediate: true },
)

function handleOpenChange(open: boolean) {
  if (!open) cancelDialog()
}

function submitDialog() {
  const dialog = activeDialog.value
  if (!dialog) return
  if (dialog.type === 'confirm') {
    resolveDialog(true)
    return
  }

  const validationError = dialog.options.validate?.(promptValue.value)
  if (validationError) {
    promptError.value = validationError
    focusInitialControl()
    return
  }

  resolveDialog(promptValue.value)
}

</script>
