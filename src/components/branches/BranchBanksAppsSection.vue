<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            Bancos
            <span class="text-sm font-normal text-gray-500">({{ banksTotalCount }})</span>
          </h3>
          <BaseButton v-if="canManageBanks" @click="$emit('create-bank')" variant="primary" size="sm" :icon="PlusIcon">
            Nuevo Banco
          </BaseButton>
        </div>

        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banco
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apps
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th v-if="canManageBanks" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="banksLoading">
                <td :colspan="canManageBanks ? 5 : 4" class="px-6 py-12 text-center">
                  <BaseLoading text="Cargando bancos..." />
                </td>
              </tr>
              <tr v-else-if="!banks.length">
                <td :colspan="canManageBanks ? 5 : 4" class="px-6 py-12 text-center text-gray-500">
                  <BuildingLibraryIcon class="mx-auto h-12 w-12 text-gray-400" />
                  <p class="mt-2 text-lg font-medium">No hay bancos</p>
                  <p class="text-sm">No se encontraron bancos para esta sucursal</p>
                </td>
              </tr>
              <tr v-for="bank in banks" :key="bank.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <BuildingLibraryIcon class="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <button @click="goToBank(bank.id)" class="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                        {{ bank.name }}
                      </button>
                      <div class="text-sm text-gray-500">ID: {{ bank.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ bank.activeApps }} / {{ bank.totalApps }} activas
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(bank.currentBalance) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <BaseBadge :variant="bank.active ? 'success' : 'danger'">
                    {{ bank.active ? 'Activo' : 'Inactivo' }}
                  </BaseBadge>
                </td>
                <td v-if="canManageBanks" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <BaseButton @click="$emit('edit-bank', bank)" variant="outline" size="sm" :icon="PencilIcon">
                      Editar
                    </BaseButton>
                    <BaseButton
                      @click="$emit('delete-bank', bank)"
                      variant="outline"
                      size="sm"
                      :icon="TrashIcon"
                      class="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            Apps de Pago
            <span class="text-sm font-normal text-gray-500">({{ appsTotalCount }})</span>
          </h3>
          <BaseButton v-if="canManageApps" @click="$emit('create-app')" variant="primary" size="sm" :icon="PlusIcon">
            Nueva App
          </BaseButton>
        </div>

        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  App
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banco
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagos
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendientes
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th v-if="canManageApps" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="appsLoading">
                <td :colspan="canManageApps ? 6 : 5" class="px-6 py-12 text-center">
                  <BaseLoading text="Cargando apps..." />
                </td>
              </tr>
              <tr v-else-if="!apps.length">
                <td :colspan="canManageApps ? 6 : 5" class="px-6 py-12 text-center text-gray-500">
                  <DevicePhoneMobileIcon class="mx-auto h-12 w-12 text-gray-400" />
                  <p class="mt-2 text-lg font-medium">No hay apps</p>
                  <p class="text-sm">No se encontraron apps para esta sucursal</p>
                </td>
              </tr>
              <tr v-for="app in apps" :key="app.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DevicePhoneMobileIcon class="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <button @click="goToApp(app.id)" class="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                        {{ app.name }}
                      </button>
                      <div class="text-sm text-gray-500">ID: {{ app.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ app.bankName }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(app.totalPayments) }}
                    <div class="text-xs text-gray-500">{{ app.totalPaymentsCount }} pagos</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(app.unsettledPayments) }}
                    <div class="text-xs text-gray-500">{{ app.unsettledPaymentsCount }} pendientes</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <BaseBadge :variant="app.active ? 'success' : 'danger'">
                    {{ app.active ? 'Activa' : 'Inactiva' }}
                  </BaseBadge>
                </td>
                <td v-if="canManageApps" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <BaseButton @click="$emit('edit-app', app)" variant="outline" size="sm" :icon="PencilIcon">
                      Editar
                    </BaseButton>
                    <BaseButton
                      @click="$emit('delete-app', app)"
                      variant="outline"
                      size="sm"
                      :icon="TrashIcon"
                      class="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import {
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { App, Bank } from '@/types/bank'

defineProps<{
  banks: Bank[]
  banksTotalCount: number
  banksLoading: boolean
  apps: App[]
  appsTotalCount: number
  appsLoading: boolean
  canManageBanks: boolean
  canManageApps: boolean
}>()

defineEmits<{
  'create-bank': []
  'edit-bank': [bank: Bank]
  'delete-bank': [bank: Bank]
  'create-app': []
  'edit-app': [app: App]
  'delete-app': [app: App]
}>()

const router = useRouter()

function goToBank(bankId: number) {
  router.push(`/banks/${bankId}`)
}

function goToApp(appId: number) {
  router.push(`/apps/${appId}`)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)
}
</script>
