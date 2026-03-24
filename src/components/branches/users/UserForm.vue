<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">

        <!-- Personal Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <BaseInput v-model="form.name" label="Nombre Completo" placeholder="Ej: Juan Pérez González" required
                :error="errors.name" :maxlength="150">
                <template #icon>
                    <UserIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseInput v-model="form.email" label="Email" type="email" placeholder="usuario@ejemplo.com" required
                :error="errors.email" :maxlength="100" @blur="validateEmail">
                <template #icon>
                    <AtSymbolIcon class="w-4 h-4" />
                </template>
            </BaseInput>
        </div>

        <!-- Contact and Role -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.phone" label="Teléfono" type="tel" placeholder="3001234567" required
                :error="errors.phone" :maxlength="10" @input="validatePhone">
                <template #icon>
                    <PhoneIcon class="w-4 h-4" />
                </template>
            </BaseInput>

            <BaseSelect v-model="form.role" :options="roleOptions" label="Rol" placeholder="Seleccionar rol..." required
                :error="errors.role" @change="validateRole" value-key="value" display-key="label">
                <template #icon>
                    <ShieldCheckIcon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <!-- Sucursal (solo superadmin al editar; mueve al usuario entre sedes) -->
        <div v-if="showBranchSelector" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseSelect v-model="form.branchId" :options="branchOptionsNormalized" label="Sucursal"
                placeholder="Seleccionar sucursal..." required :error="errors.branchId" value-key="value"
                display-key="label" @change="errors.branchId = ''">
                <template #icon>
                    <BuildingOffice2Icon class="w-4 h-4" />
                </template>
            </BaseSelect>
        </div>

        <!-- Role Constraints Alert -->
        <BaseAlert v-if="roleConstraintMessage" variant="warning">
            {{ roleConstraintMessage }}
        </BaseAlert>

        <!-- Role Description -->
        <BaseAlert v-if="selectedRoleDescription" variant="info">
            <strong>{{ selectedRoleLabel }}:</strong>
            {{ selectedRoleDescription }}
        </BaseAlert>

        <!-- Password fields (only for new users) -->
        <div v-if="!user" class="space-y-4">
            <div class="border-t border-gray-200 pt-6">
                <h4 class="text-sm font-medium text-gray-900 mb-4">Configuración de Acceso</h4>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PasswordInput v-model="form.password" label="Contraseña"
                        placeholder="Mínimo 8 caracteres" required :error="errors.password"
                        @blur="validatePassword" />

                    <PasswordInput v-model="form.confirmPassword" label="Confirmar Contraseña"
                        placeholder="Repetir contraseña" required :error="errors.confirmPassword"
                        @blur="validateConfirmPassword" />
                </div>

                <!-- Password Requirements -->
                <div class="mt-4 bg-gray-50 rounded-lg p-4">
                    <h5 class="text-sm font-medium text-gray-900 mb-2">Requisitos de la contraseña:</h5>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex items-center">
                            <CheckIcon v-if="passwordChecks.length" class="w-4 h-4 text-green-500 mr-2" />
                            <XMarkIcon v-else class="w-4 h-4 text-gray-400 mr-2" />
                            <span :class="passwordChecks.length ? 'text-green-700' : 'text-gray-500'">
                                Mínimo 8 caracteres
                            </span>
                        </div>
                        <div class="flex items-center">
                            <CheckIcon v-if="passwordChecks.uppercase" class="w-4 h-4 text-green-500 mr-2" />
                            <XMarkIcon v-else class="w-4 h-4 text-gray-400 mr-2" />
                            <span :class="passwordChecks.uppercase ? 'text-green-700' : 'text-gray-500'">
                                Una mayúscula
                            </span>
                        </div>
                        <div class="flex items-center">
                            <CheckIcon v-if="passwordChecks.lowercase" class="w-4 h-4 text-green-500 mr-2" />
                            <XMarkIcon v-else class="w-4 h-4 text-gray-400 mr-2" />
                            <span :class="passwordChecks.lowercase ? 'text-green-700' : 'text-gray-500'">
                                Una minúscula
                            </span>
                        </div>
                        <div class="flex items-center">
                            <CheckIcon v-if="passwordChecks.number" class="w-4 h-4 text-green-500 mr-2" />
                            <XMarkIcon v-else class="w-4 h-4 text-gray-400 mr-2" />
                            <span :class="passwordChecks.number ? 'text-green-700' : 'text-gray-500'">
                                Un número
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <BaseButton @click="$emit('cancel')" variant="secondary" type="button">
                Cancelar
            </BaseButton>

            <BaseButton type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ user ? 'Actualizar' : 'Crear' }} Usuario
            </BaseButton>
        </div>
    </form>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useUsersStore } from '@/store/users'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types/user'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import {
    UserIcon,
    AtSymbolIcon,
    PhoneIcon,
    ShieldCheckIcon,
    CheckIcon,
    XMarkIcon,
    BuildingOffice2Icon
} from '@heroicons/vue/24/outline'
import type { BranchUserSummary } from '@/types/common'

interface Props {
    user?: BranchUserSummary | null
    branchId: number
    /** Lista de sucursales para selector (superadmin al editar) */
    branchOptions?: Array<{ value: number; label: string }>
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    submit: [data: any]
    cancel: []
}>()

const usersStore = useUsersStore()
const authStore = useAuthStore()

const form = reactive({
    name: '',
    email: '',
    phone: '',
    role: '' as UserRole | '',
    branchId: 0,
    password: '',
    confirmPassword: ''
})

const errors = reactive({
    name: '',
    email: '',
    phone: '',
    role: '',
    branchId: '',
    password: '',
    confirmPassword: ''
})

const passwordChecks = reactive({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
})

const roleOptions = computed(() => usersStore.availableRoles)

const selectedRoleLabel = computed(() => {
    if (!form.role) return ''
    const option = roleOptions.value.find(r => r.value === form.role)
    return option?.label || ''
})

const selectedRoleDescription = computed(() => {
    const descriptions = {
        admin: 'Gestión completa de la sucursal asignada',
        cashier: 'Gestión de pedidos, clientes y caja',
        kitchen: 'Visualización y gestión de pedidos en preparación',
        deliveryman: 'Gestión de entregas y pedidos asignados'
    } as Record<string, string>

    return form.role ? descriptions[form.role] : ''
})

const roleConstraintMessage = computed(() => {
    if (!form.role || !props.branchId) return ''



    return ''
})

const showBranchSelector = computed(
    () =>
        authStore.isSuperadmin &&
        !!props.user &&
        (props.branchOptions?.length ?? 0) > 0
)

const branchOptionsNormalized = computed(() => props.branchOptions ?? [])

const isFormValid = computed(() => {
    const branchOk = !showBranchSelector.value || form.branchId > 0

    const basicValidation = form.name.trim() &&
        form.email.trim() &&
        form.phone.trim() &&
        form.role &&
        branchOk &&
        !errors.name &&
        !errors.email &&
        !errors.phone &&
        !errors.role &&
        !errors.branchId &&
        !roleConstraintMessage.value

    if (!props.user) {
        // For new users, validate passwords
        return basicValidation &&
            form.password &&
            form.confirmPassword &&
            !errors.password &&
            !errors.confirmPassword &&
            passwordChecks.length &&
            passwordChecks.uppercase &&
            passwordChecks.lowercase &&
            passwordChecks.number
    }

    return basicValidation
})

const validateEmail = () => {
    const email = form.email.trim()

    if (!email) {
        errors.email = 'El email es requerido'
        return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        errors.email = 'Ingresa un email válido'
        return
    }

    errors.email = ''
}

const validatePhone = () => {
    const phone = form.phone.trim()

    if (!phone) {
        errors.phone = 'El teléfono es requerido'
        return
    }

    if (!/^[36]\d{9}$/.test(phone)) {
        errors.phone = 'Debe ser un número válido (10 dígitos, celular con 3 o fijo con 6)'
        return
    }

    errors.phone = ''
}

const validateRole = () => {
    if (!form.role) {
        errors.role = 'Selecciona un rol'
        return
    }

    errors.role = ''
}

const validatePassword = () => {
    const password = form.password

    passwordChecks.length = password.length >= 8
    passwordChecks.uppercase = /[A-Z]/.test(password)
    passwordChecks.lowercase = /[a-z]/.test(password)
    passwordChecks.number = /\d/.test(password)

    if (!password) {
        errors.password = 'La contraseña es requerida'
        return
    }

    if (!passwordChecks.length || !passwordChecks.uppercase ||
        !passwordChecks.lowercase || !passwordChecks.number) {
        errors.password = 'La contraseña no cumple con los requisitos'
        return
    }

    errors.password = ''

    // Revalidate confirm password if it exists
    if (form.confirmPassword) {
        validateConfirmPassword()
    }
}

const validateConfirmPassword = () => {
    if (!form.confirmPassword) {
        errors.confirmPassword = 'Confirma la contraseña'
        return
    }

    if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden'
        return
    }

    errors.confirmPassword = ''
}

const validateForm = () => {
    // Validate name
    if (!form.name.trim()) {
        errors.name = 'El nombre es requerido'
    } else if (form.name.length > 150) {
        errors.name = 'El nombre no puede tener más de 150 caracteres'
    } else {
        errors.name = ''
    }

    // Validate other fields
    validateEmail()
    validatePhone()
    validateRole()

    if (showBranchSelector.value) {
        if (!form.branchId || form.branchId <= 0) {
            errors.branchId = 'Selecciona una sucursal'
        } else {
            errors.branchId = ''
        }
    }

    // Validate passwords for new users
    if (!props.user) {
        validatePassword()
        validateConfirmPassword()
    }
}

const handleSubmit = () => {
    validateForm()

    if (!isFormValid.value) {
        return
    }

    const formData: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role
    }

    if (!props.user) {
        (formData as any).password = form.password
    } else {
        formData.active = props.user.active
        if (showBranchSelector.value && form.branchId > 0) {
            formData.branchId = form.branchId
        }
    }

    emit('submit', formData)
}

// Watch for user prop changes to populate form
watch(() => props.user, (newUser) => {
    if (newUser) {
        form.name = newUser.name
        form.email = newUser.email
        form.phone = newUser.phone || ''
        form.role = newUser.role
        form.branchId = newUser.branchId
        form.password = ''
        form.confirmPassword = ''
    } else {
        // Reset form for new user
        form.name = ''
        form.email = ''
        form.phone = ''
        form.role = '' as UserRole | ''
        form.branchId = props.branchId
        form.password = ''
        form.confirmPassword = ''
    }

    // Clear errors
    Object.keys(errors).forEach(key => {
        errors[key as keyof typeof errors] = ''
    })

    // Reset password validation
    passwordChecks.length = false
    passwordChecks.uppercase = false
    passwordChecks.lowercase = false
    passwordChecks.number = false
}, { immediate: true })
</script>