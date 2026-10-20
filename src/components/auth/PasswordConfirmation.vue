<template>
  <BaseDialog :model-value="modelValue" title="Confirmar operación" :show-close-button="false" :close-on-backdrop="false" size="sm" z-class="z-[150]">
    <form class="space-y-4" @submit.prevent="submit" @keydown.esc.prevent="close">
      <p class="text-sm text-gray-700">{{ description }}</p>
      <p class="text-sm font-medium">{{ auth.userName }}</p>
      <label class="block text-sm" for="employee-confirm-password">Tu contraseña <span class="text-red-600">*</span></label>
      <input id="employee-confirm-password" ref="input" v-model="password" type="password" required maxlength="256"
        autocomplete="current-password" class="w-full rounded-md border p-2" :disabled="busy" />
      <p v-if="error" role="alert" class="text-sm text-red-700">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" :disabled="busy" @click="close">Cancelar</BaseButton>
        <BaseButton type="submit" :disabled="busy || !password" :loading="busy">Confirmar</BaseButton>
      </div>
    </form>
  </BaseDialog>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useAuthStore } from '@/store/auth';
const props = defineProps<{ modelValue: boolean; description: string; action: (password: string) => Promise<void> }>();
const emit = defineEmits<{ 'update:modelValue': [boolean] }>();
const auth = useAuthStore();
const password = ref(''), error = ref(''), busy = ref(false), input = ref<HTMLInputElement>();
let ownerId = auth.user?.id;
function close() { if (!busy.value) { password.value = ''; emit('update:modelValue', false); } }
async function submit() {
  if (busy.value || !password.value || password.value.length > 256 || !props.modelValue) return;
  if (!ownerId || auth.user?.id !== ownerId) { password.value = ''; emit('update:modelValue', false); return; }
  busy.value = true; error.value = '';
  const value = password.value; password.value = '';
  try { await props.action(value); emit('update:modelValue', false); }
  catch (e) { error.value = e instanceof Error ? e.message : 'No se pudo confirmar la operación.'; }
  finally { busy.value = false; await nextTick(); input.value?.focus(); }
}
watch(() => props.modelValue, async value => {
  password.value = ''; error.value = '';
  if (value) { ownerId = auth.user?.id; await nextTick(); input.value?.focus(); }
}, { immediate: true });
watch(() => auth.user?.id, () => { password.value = ''; error.value = ''; emit('update:modelValue', false); });
onBeforeUnmount(() => { password.value = ''; });
</script>
