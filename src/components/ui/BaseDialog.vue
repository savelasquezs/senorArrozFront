<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="fixed inset-0 flex items-center justify-center" :class="[zClass, mobileFullScreen ? 'p-0 sm:p-4' : 'p-4']">
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="closeDialog" />
        <div role="dialog" aria-modal="true" :aria-labelledby="title ? titleId : undefined"
          class="relative bg-white shadow-xl w-full" :class="[sizeClasses, panelClass,
            scrollBody ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
            mobileFullScreen ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl' : 'rounded-lg max-h-[90vh]']"
          @click.stop @keydown.esc.stop="scrollBody && closeDialog()">
          <div v-if="$slots.header || title" class="flex items-center justify-between shrink-0" :class="scrollBody ? 'px-6 py-5 border-b border-gray-100' : 'p-6 pb-0'">
            <div class="flex items-center min-w-0">
              <component v-if="icon" :is="icon" class="w-5 h-5 mr-2" :class="iconColorClass" />
              <slot name="header"><h3 :id="titleId" class="text-lg font-semibold text-gray-900">{{ title }}</h3></slot>
            </div>
            <button v-if="showCloseButton" @click="closeDialog" class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Cerrar diálogo" type="button"><XMarkIcon class="w-5 h-5" /></button>
          </div>
          <div class="p-6" :class="scrollBody ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain' : undefined"><slot /></div>
          <div v-if="$slots.footer" class="flex justify-end gap-3 shrink-0" :class="scrollBody ? 'px-6 py-4 border-t border-gray-100 bg-white' : 'p-6 pt-0'"><slot name="footer" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
interface Props {
  modelValue: boolean; title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  icon?: any; iconVariant?: 'primary' | 'danger' | 'warning' | 'success';
  showCloseButton?: boolean; closeOnBackdrop?: boolean; zClass?: string; panelClass?: string;
  /** Opt-in only: existing dialogs keep their original scrolling and dimensions. */
  scrollBody?: boolean; mobileFullScreen?: boolean;
}
const props = withDefaults(defineProps<Props>(), { size: 'md', showCloseButton: true, closeOnBackdrop: true, zClass: 'z-50', scrollBody: false, mobileFullScreen: false });
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const titleId = useId();
const sizeClasses = computed(() => ({ sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl', '5xl': 'max-w-5xl', '6xl': 'max-w-6xl', '7xl': 'max-w-7xl' })[props.size]);
const iconColorClass = computed(() => ({ primary: 'text-green-600', danger: 'text-red-600', warning: 'text-yellow-600', success: 'text-green-600' })[props.iconVariant || 'primary']);
function closeDialog() { if (props.closeOnBackdrop) emit('update:modelValue', false); }
</script>
<style scoped>
.dialog-enter-active,.dialog-leave-active { transition: opacity .2s ease; }
.dialog-enter-from,.dialog-leave-to { opacity: 0; }
.dialog-enter-active .relative,.dialog-leave-active .relative { transition: transform .2s ease,opacity .2s ease; }
.dialog-enter-from .relative,.dialog-leave-to .relative { transform: scale(.95); opacity: 0; }
@media(prefers-reduced-motion: reduce) { .dialog-enter-active,.dialog-leave-active,.dialog-enter-active .relative,.dialog-leave-active .relative { transition: none; } }
</style>
