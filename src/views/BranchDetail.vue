<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import { UserRole } from '@/types/auth'

const route = useRoute()
const router = useRouter()
const branches = useBranchesStore()
const auth = useAuthStore()

const id = Number(route.params.id)

const canManageBranch = computed(() => {
    if (!branches.current) return false
    if (auth.isSuperadmin) return true
    return auth.isAdmin && auth.branchId === branches.current.id
})

onMounted(async () => {
    const authorized = auth.isSuperadmin || (auth.isAdmin && auth.branchId === id)
    if (!authorized) {
        router.replace('/dashboard')
        return
    }
    try {
        await branches.fetchById(id)
    } catch (e) {
        toast('error', branches.error || 'Error al cargar sucursal')
    }
})

const remove = async () => {
    if (!auth.isSuperadmin) return
    await branches.remove(id)
    window.history.back()
}

// Edit branch dialog (Superadmin)
const showEdit = ref(false)
const editName = ref('')
const editAddress = ref('')
const editPhone1 = ref('')
const editPhone2 = ref('')
const saving = ref(false)

const openEdit = () => {
    if (!branches.current) return
    editName.value = branches.current.name
    editAddress.value = branches.current.address
    editPhone1.value = branches.current.phone1
    editPhone2.value = branches.current.phone2
    showEdit.value = true
}

const submitEdit = async () => {
    try {
        saving.value = true
        await branches.update(id, { name: editName.value, address: editAddress.value, phone1: editPhone1.value, phone2: editPhone2.value })
        showEdit.value = false
        toast('success', 'Sucursal actualizada')
    } finally {
        saving.value = false
    }
}

// Create user dialog with constraints
const showCreateUser = ref(false)
const userName = ref('')
const userEmail = ref('')
const userPassword = ref('')
const userRole = ref<string>('')
const creatingUser = ref(false)

const roleOptions = [
    { value: UserRole.SUPERADMIN, label: 'Superadmin' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.CASHIER, label: 'Cashier' },
    { value: UserRole.KITCHEN, label: 'Kitchen' },
    { value: UserRole.DELIVERYMAN, label: 'Deliveryman' }
]

const filteredRoleOptions = computed(() => {
    if (auth.isSuperadmin) return roleOptions
    if (auth.isAdmin) return roleOptions.filter(r => [UserRole.CASHIER, UserRole.KITCHEN, UserRole.DELIVERYMAN].includes(r.value as any))
    return []
})

const uniqueRoleViolation = computed(() => {
    if (!branches.current) return null
    const users = branches.current.users
    if (userRole.value === UserRole.ADMIN) {
        const hasAdmin = users.some(u => u.role === UserRole.ADMIN)
        return hasAdmin ? 'Ya existe un Admin en esta sucursal' : null
    }
    if (userRole.value === UserRole.KITCHEN) {
        const hasKitchen = users.some(u => u.role === UserRole.KITCHEN)
        return hasKitchen ? 'Ya existe un usuario de Kitchen en esta sucursal' : null
    }
    if (userRole.value === UserRole.SUPERADMIN) {
        // Only one Superadmin in the entire app (client-side hint; server should enforce)
        const hasSuperadminAnywhere = false
        return hasSuperadminAnywhere ? 'Ya existe un Superadmin en la aplicación' : null
    }
    return null
})

const openCreateUser = () => {
    userName.value = ''
    userEmail.value = ''
    userPassword.value = ''
    userRole.value = ''
    showCreateUser.value = true
}

const submitCreateUser = async () => {
    if (!branches.current) return
    if (uniqueRoleViolation.value) return
    try {
        creatingUser.value = true
        await (await import('@/services/mainApi')).mainApi.createUser({
            name: userName.value,
            email: userEmail.value,
            password: userPassword.value,
            role: userRole.value as any,
            branchId: auth.isSuperadmin ? (userRole.value === UserRole.SUPERADMIN ? undefined : branches.current.id) : branches.current.id
        })
        showCreateUser.value = false
        await branches.fetchById(id)
        toast('success', 'Usuario creado')
    } finally {
        creatingUser.value = false
    }
}

// toast helpers
const showToast = ref(false)
const toastMsg = ref('')
const toastType = ref<'error' | 'success' | 'info' | 'warning'>('info')
const toast = (type: 'error' | 'success' | 'info' | 'warning', msg: string) => {
    toastType.value = type
    toastMsg.value = msg
    showToast.value = true
}
</script>

<template>
    <MainLayout>
        <div class="p-4">
            <BaseLoading v-if="branches.isLoading" />
            <template v-else>
                <template v-if="canManageBranch">
                    <div class="flex items-start gap-4">
                        <BaseCard class="flex-1">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-lg font-semibold">{{ branches.current?.name }}</h2>
                                    <div class="text-sm text-gray-600">{{ branches.current?.address }}</div>
                                    <div class="text-sm text-gray-600">Tel: {{ branches.current?.phone1 }} {{
                                        branches.current?.phone2 }}</div>
                                </div>
                                <div class="flex gap-2" v-if="auth.isSuperadmin">
                                    <BaseButton color="secondary" @click="openEdit">Editar</BaseButton>
                                    <BaseButton color="danger" @click="remove">Eliminar</BaseButton>
                                </div>
                            </div>
                        </BaseCard>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <BaseCard>
                            <h3 class="font-semibold mb-2">Usuarios</h3>
                            <table class="min-w-full text-sm">
                                <thead>
                                    <tr class="text-left border-b">
                                        <th class="py-2 pr-4">Nombre</th>
                                        <th class="py-2 pr-4">Email</th>
                                        <th class="py-2 pr-4">Rol</th>
                                        <th class="py-2 pr-4">Activo</th>
                                        <th class="py-2 pr-4">Último ingreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="u in branches.current?.users || []" :key="u.id" class="border-b">
                                        <td class="py-2 pr-4">{{ u.name }}</td>
                                        <td class="py-2 pr-4">{{ u.email }}</td>
                                        <td class="py-2 pr-4">{{ u.role }}</td>
                                        <td class="py-2 pr-4">{{ u.active ? 'Sí' : 'No' }}</td>
                                        <td class="py-2 pr-4">{{ new Date(u.lastLogin).toLocaleString() }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="mt-2 text-xs text-gray-500">
                                Controles de creación/rol se implementarán aquí respetando reglas: Superadmin puede
                                todos;
                                Admin
                                de sucursal solo Cashier/Deliveryman/Kitchen y unicidad de Admin y Kitchen por sucursal.
                            </div>
                        </BaseCard>

                        <BaseCard>
                            <h3 class="font-semibold mb-2">Barrios</h3>
                            <table class="min-w-full text-sm">
                                <thead>
                                    <tr class="text-left border-b">
                                        <th class="py-2 pr-4">Nombre</th>
                                        <th class="py-2 pr-4">Domicilio</th>
                                        <th class="py-2 pr-4">Clientes</th>
                                        <th class="py-2 pr-4">Direcciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="n in branches.current?.neighborhoods || []" :key="n.id" class="border-b">
                                        <td class="py-2 pr-4">{{ n.name }}</td>
                                        <td class="py-2 pr-4">{{ n.deliveryFee }}</td>
                                        <td class="py-2 pr-4">{{ n.totalCustomers }}</td>
                                        <td class="py-2 pr-4">{{ n.totalAddresses }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </BaseCard>
                    </div>
                    <div class="mt-4" v-if="canManageBranch">
                        <BaseButton color="primary" @click="openCreateUser">Crear usuario</BaseButton>
                    </div>

                    <BaseDialog v-model="showEdit" title="Editar Sucursal">
                        <div class="grid grid-cols-1 gap-3">
                            <BaseInput v-model="editName" label="Nombre" />
                            <BaseInput v-model="editAddress" label="Dirección" />
                            <BaseInput v-model="editPhone1" label="Teléfono 1" />
                            <BaseInput v-model="editPhone2" label="Teléfono 2" />
                            <div class="flex justify-end gap-2 mt-2">
                                <BaseButton color="secondary" @click="showEdit = false">Cancelar</BaseButton>
                                <BaseButton :disabled="!editName || !editAddress" :loading="saving" color="primary"
                                    @click="submitEdit">Guardar</BaseButton>
                            </div>
                        </div>
                    </BaseDialog>

                    <BaseDialog v-model="showCreateUser" title="Crear Usuario">
                        <div class="grid grid-cols-1 gap-3">
                            <BaseInput v-model="userName" label="Nombre" />
                            <BaseInput v-model="userEmail" label="Email" />
                            <BaseInput v-model="userPassword" type="password" label="Contraseña" />
                            <BaseSelect v-model="userRole" :options="filteredRoleOptions" label="Rol" />
                            <BaseAlert v-if="uniqueRoleViolation" type="warning">{{ uniqueRoleViolation }}</BaseAlert>
                            <div class="flex justify-end gap-2 mt-2">
                                <BaseButton color="secondary" @click="showCreateUser = false">Cancelar</BaseButton>
                                <BaseButton
                                    :disabled="!userName || !userEmail || !userPassword || !userRole || !!uniqueRoleViolation"
                                    :loading="creatingUser" color="primary" @click="submitCreateUser">Crear</BaseButton>
                            </div>
                        </div>
                    </BaseDialog>
                </template>
                <BaseAlert v-else type="warning">No tienes permiso para ver esta sucursal.</BaseAlert>
            </template>
            <BaseToast v-model="showToast" :message="toastMsg" :type="toastType" />
        </div>
    </MainLayout>
</template>
