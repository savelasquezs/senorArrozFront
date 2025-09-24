<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBranchesStore } from '@/store/branches'
import { useAuthStore } from '@/store/auth'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
// import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import { useRouter } from 'vue-router'

const store = useBranchesStore()
const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const address = ref('')
const phone = ref('')

const page = ref(1)
const pageSize = ref(10)

const load = async () => {
    try {
        await store.fetch({ Name: name.value || undefined, Address: address.value || undefined, Phone: phone.value || undefined, Page: page.value, PageSize: pageSize.value })
    } catch (e) {
        toastType.value = 'error'
        toastMsg.value = store.error || 'Error al cargar sucursales'
        showToast.value = true
    }
}

const clearFilters = async () => {
    name.value = ''
    address.value = ''
    phone.value = ''
    page.value = 1
    await load()
}

const goDetail = (id: number) => router.push({ name: 'BranchDetail', params: { id } })

onMounted(load)

// Create branch dialog (Superadmin)
const showCreate = ref(false)
const formName = ref('')
const formAddress = ref('')
const formPhone1 = ref('')
const formPhone2 = ref('')
const creating = ref(false)
const showToast = ref(false)
const toastMsg = ref('')
const toastType = ref<'error' | 'success' | 'info' | 'warning'>('info')

const openCreate = () => {
    formName.value = ''
    formAddress.value = ''
    formPhone1.value = ''
    formPhone2.value = ''
    showCreate.value = true
}

const submitCreate = async () => {
    try {
        creating.value = true
        await store.create({ name: formName.value, address: formAddress.value, phone1: formPhone1.value, phone2: formPhone2.value })
        showCreate.value = false
        await load()
    } catch (e) {
        toastType.value = 'error'
        toastMsg.value = store.error || 'Ocurrió un error'
        showToast.value = true
    } finally {
        creating.value = false
    }
}
</script>

<template>
    <MainLayout>
        <div class="p-4">
            <BaseCard>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <BaseInput v-model="name" label="Nombre" placeholder="Buscar por nombre" />
                    <BaseInput v-model="address" label="Dirección" placeholder="Buscar por dirección" />
                    <BaseInput v-model="phone" label="Teléfono" placeholder="Buscar por teléfono" />
                    <div class="flex gap-2">
                        <BaseButton color="primary" @click="load">Filtrar</BaseButton>
                        <BaseButton color="secondary" @click="clearFilters">Limpiar</BaseButton>
                    </div>
                </div>
            </BaseCard>

            <div class="mt-4">
                <div class="flex justify-end mb-2" v-if="auth.isSuperadmin">
                    <BaseButton color="primary" @click="openCreate">Nueva Sucursal</BaseButton>
                </div>
                <BaseLoading v-if="store.isLoading" />
                <BaseCard v-else>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="text-left border-b">
                                    <th class="py-2 pr-4">Nombre</th>
                                    <th class="py-2 pr-4">Dirección</th>
                                    <th class="py-2 pr-4">Teléfono</th>
                                    <th class="py-2 pr-4">Usuarios</th>
                                    <th class="py-2 pr-4">Clientes</th>
                                    <th class="py-2 pr-4">Barrios</th>
                                    <th class="py-2 pr-4" />
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="b in store.list?.items || []" :key="b.id" class="border-b hover:bg-gray-50">
                                    <td class="py-2 pr-4">{{ b.name }}</td>
                                    <td class="py-2 pr-4">{{ b.address }}</td>
                                    <td class="py-2 pr-4">{{ b.phone1 }}</td>
                                    <td class="py-2 pr-4">{{ b.totalUsers }} (activos {{ b.activeUsers }})</td>
                                    <td class="py-2 pr-4">{{ b.totalCustomers }} (activos {{ b.activeCustomers }})</td>
                                    <td class="py-2 pr-4">{{ b.totalNeighborhoods }}</td>
                                    <td class="py-2 pr-4 text-right">
                                        <BaseButton size="sm" color="primary" @click="goDetail(b.id)">Ver</BaseButton>
                                    </td>
                                </tr>
                                <tr v-if="(store.list?.items?.length || 0) === 0">
                                    <td class="py-6 text-center text-gray-500" colspan="7">Sin resultados</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="flex items-center justify-between mt-4">
                        <div class="text-sm">Página {{ store.list?.page || 1 }} de {{ store.list?.totalPages || 1 }}
                        </div>
                        <div class="flex gap-2">
                            <BaseButton size="sm" :disabled="!(store.list?.hasPreviousPage)"
                                @click="page = (page - 1); load()">Anterior</BaseButton>
                            <BaseButton size="sm" :disabled="!(store.list?.hasNextPage)"
                                @click="page = (page + 1); load()">
                                Siguiente</BaseButton>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <BaseDialog v-model="showCreate" title="Nueva Sucursal">
                <div class="grid grid-cols-1 gap-3">
                    <BaseInput v-model="formName" label="Nombre" />
                    <BaseInput v-model="formAddress" label="Dirección" />
                    <BaseInput v-model="formPhone1" label="Teléfono 1" />
                    <BaseInput v-model="formPhone2" label="Teléfono 2" />
                    <div class="flex justify-end gap-2 mt-2">
                        <BaseButton color="secondary" @click="showCreate = false">Cancelar</BaseButton>
                        <BaseButton :disabled="!formName || !formAddress" :loading="creating" color="primary"
                            @click="submitCreate">Crear</BaseButton>
                    </div>
                </div>
            </BaseDialog>
        </div>
        <BaseToast v-model="showToast" :message="toastMsg" :type="toastType" />
    </MainLayout>
</template>
