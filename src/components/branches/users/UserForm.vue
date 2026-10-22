<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseInput v-model="form.name" label="Nombre completo" required :maxlength="150" />
      <BaseInput v-model="form.email" label="Correo" type="email" required :maxlength="100" />
      <BaseInput v-model="form.phone" label="Teléfono" type="tel" required :maxlength="10"
        placeholder="3001234567" :error="form.phone && !phoneValid ? 'Ingresa 10 dígitos; debe comenzar por 3 o 6.' : ''" />
      <BaseSelect v-model="form.role" :options="roleOptions" label="Rol" required
        value-key="value" display-key="label" :disabled="terminal" />
    </div>

    <fieldset v-if="form.role === 'Kitchen'" class="rounded-lg border border-gray-200 p-4 space-y-3">
      <legend class="px-1 text-sm font-medium">Tipo de cuenta de cocina</legend>
      <template v-if="!user">
        <label class="flex gap-2 text-sm"><input v-model="form.accountType" type="radio" value="personal" name="account-type" />
          Persona: sus permisos, documentos, perfil y almuerzo.</label>
        <label class="flex gap-2 text-sm"><input v-model="form.accountType" type="radio" value="terminal" name="account-type" />
          Terminal: pantalla compartida de pedidos y almuerzos de los cocineros.</label>
      </template>
      <p v-else class="text-sm" data-testid="account-type">{{ terminal ? 'Terminal compartida' : 'Cuenta personal' }}.
        El tipo no se cambia al editar; crea una cuenta separada para la pantalla.</p>
      <label class="flex gap-2 text-sm"><input v-model="form.webAccessEnabled" type="checkbox" name="web-access" />
        Habilitar acceso web a esta cuenta.</label>
      <p class="text-xs text-gray-500">El acceso web no convierte una persona en terminal. No modifica su estado laboral ni su historial.</p>
      <PasswordInput v-if="terminal && !user" v-model="form.confirmationPassword" label="Tu contraseña de administrador"
        placeholder="Confirma quién crea la terminal" required autocomplete="current-password" :maxlength="256" />
    </fieldset>

    <label v-if="canUseDeliveryApp" class="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm">
      <input v-model="form.deliveryAppEnabled" type="checkbox" class="mt-1" />
      <span>Habilitar app de domicilios<span class="block text-xs text-gray-500 mt-1">
        Conserva su rol en la web. Iniciar sesión en una aplicación cierra la anterior.</span></span>
    </label>
    <div v-if="showBranchSelector" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseSelect v-model="form.branchId" :options="branchOptions ?? []" label="Sucursal" required
        value-key="value" display-key="label" />
    </div>
    <div v-if="!terminal" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseSelect v-model="form.payrollExpenseId" :options="payrollExpenseOptions" label="Gasto de nómina (catálogo)"
        placeholder="Sin asignar" value-key="value" display-key="label" />
    </div>
    <BaseAlert v-else variant="info">La terminal no tiene nómina, permisos propios ni acceso a domicilios.</BaseAlert>

    <div v-if="!user" class="border-t border-gray-200 pt-4 space-y-3">
      <h4 class="text-sm font-medium">Credenciales de la nueva cuenta</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PasswordInput v-model="form.password" label="Contraseña de la nueva cuenta" required autocomplete="new-password" :maxlength="256" />
        <PasswordInput v-model="form.confirmPassword" label="Repetir contraseña de la nueva cuenta" required autocomplete="new-password" :maxlength="256"
          :error="form.confirmPassword && form.password !== form.confirmPassword ? 'Las contraseñas no coinciden.' : ''" />
      </div>
      <p class="text-xs text-gray-500">Mínimo 8 caracteres, una mayúscula, una minúscula y un número.</p>
    </div>
    <div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
      <BaseButton type="button" variant="secondary" :disabled="loading" @click="cancel">Cancelar</BaseButton>
      <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!valid || loading">
        {{ user ? 'Actualizar usuario' : terminal ? 'Crear terminal' : 'Crear usuario' }}
      </BaseButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted, onBeforeUnmount, ref } from 'vue';
import { useUsersStore } from '@/store/users';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/types/user';
import type { AccountType } from '@/types/employeeLeave';
import type { BranchUserSummary } from '@/types/common';
import { expenseApi } from '@/services/MainAPI/expenseApi';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseAlert from '@/components/ui/BaseAlert.vue';
import PasswordInput from '@/components/ui/PasswordInput.vue';

type AccountUser = BranchUserSummary & { accountType?: AccountType };
const props = withDefaults(defineProps<{
  user?: AccountUser | null; branchId: number;
  branchOptions?: Array<{ value: number; label: string }>; loading?: boolean;
}>(), { loading: false });
const emit = defineEmits<{ submit: [data: Record<string, unknown>]; cancel: [] }>();
const users = useUsersStore(), auth = useAuthStore();
const form = reactive({ name: '', email: '', phone: '', role: '' as UserRole | '',
  accountType: 'personal' as AccountType, webAccessEnabled: true, deliveryAppEnabled: false,
  branchId: 0, payrollExpenseId: 0, password: '', confirmPassword: '', confirmationPassword: '' });
const payrollExpenseOptions = ref<Array<{ value: number; label: string }>>([{ value: 0, label: 'Sin asignar' }]);
const terminal = computed(() => form.accountType === 'terminal');
const roleOptions = computed(() => users.availableRoles);
const canUseDeliveryApp = computed(() => !terminal.value && (form.role === 'Admin' || form.role === 'Cashier'));
const showBranchSelector = computed(() => auth.isSuperadmin && !!props.user && !!props.branchOptions?.length);
const phoneValid = computed(() => /^[36]\d{9}$/.test(form.phone.trim()));
const passwordValid = computed(() => form.password.length >= 8 && form.password.length <= 256
  && /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) && /\d/.test(form.password)
  && form.password === form.confirmPassword);
const valid = computed(() => !!form.name.trim() && form.name.length <= 150
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.email.length <= 100
  && phoneValid.value && !!form.role && (!showBranchSelector.value || form.branchId > 0)
  && (props.user || passwordValid.value)
  && (!terminal.value || form.role === 'Kitchen' && (props.user || !!form.confirmationPassword && form.confirmationPassword.length <= 256)));

function clearPasswords() { form.password = ''; form.confirmPassword = ''; form.confirmationPassword = ''; }
function cancel() { clearPasswords(); emit('cancel'); }
function handleSubmit() {
  if (!valid.value || props.loading) return;
  const payload: Record<string, unknown> = {
    name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role,
    deliveryAppEnabled: canUseDeliveryApp.value && form.deliveryAppEnabled,
    payrollExpenseId: !terminal.value && form.payrollExpenseId > 0 ? form.payrollExpenseId : null,
    ...(form.role === 'Kitchen' ? { webAccessEnabled: form.webAccessEnabled } : {})
  };
  if (props.user) {
    payload.active = props.user.active;
    if (showBranchSelector.value) payload.branchId = form.branchId;
  } else {
    payload.password = form.password;
    payload.accountType = form.accountType;
    if (terminal.value) payload.confirmationPassword = form.confirmationPassword;
  }
  clearPasswords();
  emit('submit', payload);
}
watch(() => form.accountType, () => {
  form.confirmationPassword = '';
  if (terminal.value) { form.role = 'Kitchen'; form.payrollExpenseId = 0; form.deliveryAppEnabled = false; }
});
watch(() => form.role, role => { if (role !== 'Kitchen') form.accountType = 'personal'; });
watch(() => props.user, user => {
  Object.assign(form, {
    name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', role: user?.role ?? '',
    accountType: user?.accountType ?? 'personal', webAccessEnabled: user?.webAccessEnabled ?? true,
    deliveryAppEnabled: !!user?.deliveryAppEnabled, branchId: user?.branchId ?? props.branchId,
    payrollExpenseId: user?.payrollExpenseId ?? 0
  });
  clearPasswords();
}, { immediate: true });
onBeforeUnmount(clearPasswords);
onMounted(async () => {
  try {
    const response = await expenseApi.getAllExpenses();
    payrollExpenseOptions.value = [{ value: 0, label: 'Sin asignar' },
      ...(response.data ?? []).map(item => ({ value: item.id, label: item.name }))];
  } catch { /* El catálogo de nómina es opcional; no impide gestionar accesos. */ }
});
</script>
