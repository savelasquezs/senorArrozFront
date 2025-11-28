<!-- src/views/BranchDetail.vue -->
<template>
    <MainLayout>
        <div class="p-6">
            <!-- Loading State -->
            <BaseLoading v-if="branchesStore.isLoading" text="Cargando sucursal..." />

            <!-- Access Denied -->
            <BaseAlert v-else-if="!canAccessBranch" variant="danger" class="max-w-2xl">
                <ExclamationTriangleIcon class="w-5 h-5" />
                <div>
                    <h3 class="font-medium">Acceso Denegado</h3>
                    <p class="mt-1">No tienes permisos para ver esta sucursal.</p>
                </div>
            </BaseAlert>

            <!-- Branch Content -->
            <div v-else-if="branch" class="space-y-6">
                <!-- Branch Header -->
                <div class="bg-white shadow rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="flex-shrink-0">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <BuildingOffice2Icon class="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">{{ branch.name }}</h1>
                                    <p class="text-sm text-gray-500">Sucursal ID: {{ branch.id }}</p>
                                </div>
                            </div>

                            <!-- Actions (Only for Superadmin) -->
                            <div v-if="authStore.user?.role === 'Superadmin'" class="flex space-x-2">
                                <BaseButton @click="openEditDialog" variant="secondary" :icon="PencilIcon">
                                    Editar
                                </BaseButton>
                                <BaseButton @click="confirmDelete" variant="danger" :icon="TrashIcon">
                                    Eliminar
                                </BaseButton>
                            </div>
                        </div>
                    </div>

                    <!-- Branch Info -->
                    <div class="px-6 py-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="flex items-center">
                                <MapPinIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div>
                                    <p class="text-sm font-medium text-gray-900">Dirección</p>
                                    <p class="text-sm text-gray-600">{{ branch.address }}</p>
                                </div>
                            </div>

                            <div class="flex items-center">
                                <PhoneIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div class="space-y-1">
                                    <p class="text-sm font-medium text-gray-900">Teléfono Principal</p>
                                    <PhoneNumberItem :phone-number="branch.phone1" />
                                </div>
                            </div>

                            <div v-if="branch.phone2" class="flex items-center">
                                <PhoneIcon class="w-5 h-5 text-gray-400 mr-3" />
                                <div class="space-y-1">
                                    <p class="text-sm font-medium text-gray-900">Teléfono Secundario</p>
                                    <PhoneNumberItem :phone-number="branch.phone2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <UserGroupIcon class="w-8 h-8 text-blue-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Usuarios</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ branch.users.length }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <MapIcon class="w-8 h-8 text-green-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Barrios</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ branch.neighborhoods?.length || 0 }}
                                </p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <UsersIcon class="w-8 h-8 text-purple-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Clientes</p>
                                <p class="text-2xl font-semibold text-gray-900">{{ totalCustomers }}</p>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <CalendarIcon class="w-8 h-8 text-orange-600" />
                            </div>
                            <div class="ml-4">
                                <p class="text-sm font-medium text-gray-500">Creada</p>
                                <p class="text-sm font-semibold text-gray-900">{{ formatDate(branch.createdAt) }}</p>
                            </div>
                        </div>
                    </BaseCard>
                </div>

                <!-- Users Section -->
                <BaseCard>
                    <BranchUsersTable :users="branch.users" :branch-id="branch.id" @user-created="handleUserCreated"
                        @user-updated="handleUserUpdated" @user-status-toggled="handleUserStatusToggled"
                        @error="handleUserError" />
                </BaseCard>

                <!-- Neighborhoods Section -->
                <BaseCard v-if="branch.neighborhoods && branch.neighborhoods.length > 0">
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            Barrios de Cobertura
                            <span class="text-sm font-normal text-gray-500">({{ branch.neighborhoods.length }})</span>
                        </h3>

                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Barrio
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tarifa Domicilio
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Clientes
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Direcciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="neighborhood in branch.neighborhoods" :key="neighborhood.id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {{ neighborhood.name }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            ${{ neighborhood.deliveryFee?.toLocaleString() }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ neighborhood.totalCustomers || 0 }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ neighborhood.totalAddresses || 0 }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </BaseCard>

                <!-- Banks Section -->
                <BaseCard>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">
                                Bancos
                                <span class="text-sm font-normal text-gray-500">({{ banksStore.list?.totalCount || 0
                                }})</span>
                            </h3>
                            <BaseButton v-if="canManageBanks" @click="openCreateBank" variant="primary" size="sm"
                                :icon="PlusIcon">
                                Nuevo Banco
                            </BaseButton>
                        </div>

                        <!-- Banks Table -->
                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Banco
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Apps
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Balance
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th v-if="canManageBanks"
                                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-if="banksStore.isLoading">
                                        <td :colspan="canManageBanks ? 5 : 4" class="px-6 py-12 text-center">
                                            <BaseLoading text="Cargando bancos..." />
                                        </td>
                                    </tr>
                                    <tr v-else-if="!banksStore.list?.items?.length">
                                        <td :colspan="canManageBanks ? 5 : 4"
                                            class="px-6 py-12 text-center text-gray-500">
                                            <BuildingLibraryIcon class="mx-auto h-12 w-12 text-gray-400" />
                                            <p class="mt-2 text-lg font-medium">No hay bancos</p>
                                            <p class="text-sm">No se encontraron bancos para esta sucursal</p>
                                        </td>
                                    </tr>
                                    <tr v-for="bank in banksStore.list?.items || []" :key="bank.id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center">
                                                <div class="flex-shrink-0 h-10 w-10">
                                                    <div
                                                        class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <BuildingLibraryIcon class="h-5 w-5 text-blue-600" />
                                                    </div>
                                                </div>
                                                <div class="ml-4">
                                                    <button @click="$router.push(`/banks/${bank.id}`)"
                                                        class="text-sm font-medium text-indigo-600 hover:text-indigo-900">
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
                                        <td v-if="canManageBanks"
                                            class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div class="flex justify-end space-x-2">
                                                <BaseButton @click="openEditBank(bank)" variant="outline" size="sm"
                                                    :icon="PencilIcon">
                                                    Editar
                                                </BaseButton>
                                                <BaseButton @click="deleteBank(bank)" variant="outline" size="sm"
                                                    :icon="TrashIcon" class="text-red-600 hover:text-red-700">
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

                <!-- Apps Section -->
                <BaseCard>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-900">
                                Apps de Pago
                                <span class="text-sm font-normal text-gray-500">({{ appsStore.list?.totalCount || 0
                                }})</span>
                            </h3>
                            <BaseButton v-if="canManageApps" @click="openCreateApp" variant="primary" size="sm"
                                :icon="PlusIcon">
                                Nueva App
                            </BaseButton>
                        </div>

                        <!-- Apps Table -->
                        <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            App
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Banco
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Pagos
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Pendientes
                                        </th>
                                        <th
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th v-if="canManageApps"
                                            class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-if="appsStore.isLoading">
                                        <td :colspan="canManageApps ? 6 : 5" class="px-6 py-12 text-center">
                                            <BaseLoading text="Cargando apps..." />
                                        </td>
                                    </tr>
                                    <tr v-else-if="!appsStore.list?.items?.length">
                                        <td :colspan="canManageApps ? 6 : 5"
                                            class="px-6 py-12 text-center text-gray-500">
                                            <DevicePhoneMobileIcon class="mx-auto h-12 w-12 text-gray-400" />
                                            <p class="mt-2 text-lg font-medium">No hay apps</p>
                                            <p class="text-sm">No se encontraron apps para esta sucursal</p>
                                        </td>
                                    </tr>
                                    <tr v-for="app in appsStore.list?.items || []" :key="app.id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="flex items-center">
                                                <div class="flex-shrink-0 h-10 w-10">
                                                    <div
                                                        class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <DevicePhoneMobileIcon class="h-5 w-5 text-green-600" />
                                                    </div>
                                                </div>
                                                <div class="ml-4">
                                                    <button @click="$router.push(`/apps/${app.id}`)"
                                                        class="text-sm font-medium text-indigo-600 hover:text-indigo-900">
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
                                                <div class="text-xs text-gray-500">{{ app.totalPaymentsCount }} pagos
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div class="text-sm text-gray-900">
                                                {{ formatCurrency(app.unsettledPayments) }}
                                                <div class="text-xs text-gray-500">{{ app.unsettledPaymentsCount }}
                                                    pendientes</div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <BaseBadge :variant="app.active ? 'success' : 'danger'">
                                                {{ app.active ? 'Activa' : 'Inactiva' }}
                                            </BaseBadge>
                                        </td>
                                        <td v-if="canManageApps"
                                            class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div class="flex justify-end space-x-2">
                                                <BaseButton @click="openEditApp(app)" variant="outline" size="sm"
                                                    :icon="PencilIcon">
                                                    Editar
                                                </BaseButton>
                                                <BaseButton @click="deleteApp(app)" variant="outline" size="sm"
                                                    :icon="TrashIcon" class="text-red-600 hover:text-red-700">
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

                <!-- Expenses Section -->
                <BaseCard>
                    <div class="space-y-4">
                        <!-- Tabs -->
                        <div class="border-b border-gray-200">
                            <nav class="-mb-px flex space-x-8">
                                <button @click="expensesActiveTab = 'categories'" :class="[
                                    expensesActiveTab === 'categories'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                                ]">
                                    Categorías
                                </button>
                                <button @click="expensesActiveTab = 'expenses'" :class="[
                                    expensesActiveTab === 'expenses'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                                ]">
                                    Gastos
                                </button>
                                <button @click="expensesActiveTab = 'suppliers'" :class="[
                                    expensesActiveTab === 'suppliers'
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
                                ]">
                                    Proveedores
                                </button>
                            </nav>
                        </div>

                        <!-- Categories Tab -->
                        <ExpenseCategoriesTable v-if="expensesActiveTab === 'categories'" :list="expenseCategoriesList"
                            :loading="expenseCategoriesLoading" @create="openCreateExpenseCategory"
                            @edit="openEditExpenseCategory" @delete="deleteExpenseCategory"
                            @previous-page="previousExpenseCategoryPage" @next-page="nextExpenseCategoryPage" />

                        <!-- Expenses Tab -->
                        <ExpensesTable v-if="expensesActiveTab === 'expenses'" :list="expensesList"
                            :categories="expenseCategoriesList?.items || []" :loading="expensesLoading"
                            @create="openCreateExpense" @edit="openEditExpense" @delete="deleteExpense"
                            @filter-change="onExpenseFilterChange" @search-change="onExpenseSearchChange"
                            @previous-page="previousExpensePage" @next-page="nextExpensePage" />

                        <SuppliersTable v-if="expensesActiveTab === 'suppliers'" :list="suppliersList"
                            :loading="suppliersLoading" :can-manage="canManageSuppliers" @create="openCreateSupplier"
                            @edit="openEditSupplier" @delete="deleteSupplier" @previous-page="previousSupplierPage"
                            @next-page="nextSupplierPage" />
                    </div>
                </BaseCard>
            </div>

            <!-- Edit Branch Dialog -->
            <BaseDialog v-model="showEditDialog" title="Editar Sucursal" :icon="PencilIcon" size="lg">
                <BranchForm :branch="branch" @submit="handleEditSubmit" @cancel="showEditDialog = false"
                    :loading="branchesStore.isLoading" />
            </BaseDialog>

            <!-- Delete Confirmation Dialog -->
            <BaseDialog v-model="showDeleteDialog" title="Confirmar Eliminación" :icon="ExclamationTriangleIcon"
                icon-variant="danger" size="md">
                <div class="text-center">
                    <ExclamationTriangleIcon class="mx-auto h-12 w-12 text-red-600" />
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900">Eliminar Sucursal</h3>
                        <div class="mt-2">
                            <p class="text-sm text-gray-500">
                                ¿Estás seguro de que deseas eliminar la sucursal
                                <strong>{{ branch?.name }}</strong>?
                            </p>
                            <p class="text-sm text-red-600 mt-2">
                                Esta acción no se puede deshacer y eliminará todos los datos asociados.
                            </p>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <BaseButton @click="showDeleteDialog = false" variant="secondary">
                        Cancelar
                    </BaseButton>
                    <BaseButton @click="handleDelete" variant="danger" :loading="branchesStore.isLoading">
                        Eliminar Sucursal
                    </BaseButton>
                </template>
            </BaseDialog>

            <!-- Bank Form Dialog -->
            <BaseDialog v-model="showBankForm" :title="editingBank ? 'Editar Banco' : 'Nuevo Banco'"
                :icon="BuildingLibraryIcon" size="lg">
                <BankForm :bank="editingBank" :loading="banksStore.isLoading" @submit="handleBankSubmit"
                    @cancel="showBankForm = false" />
            </BaseDialog>

            <!-- App Form Dialog -->
            <BaseDialog v-model="showAppForm" :title="editingApp ? 'Editar App' : 'Nueva App'"
                :icon="DevicePhoneMobileIcon" size="lg">
                <AppForm :app="editingApp" :loading="appsStore.isLoading" @submit="handleAppSubmit"
                    @cancel="showAppForm = false" />
            </BaseDialog>

            <!-- Expense Category Form Dialog -->
            <ExpenseCategoryFormModal :is-open="showExpenseCategoryForm" :editing-category="editingExpenseCategory"
                :loading="expenseCategoryFormLoading" @close="showExpenseCategoryForm = false"
                @submit="handleExpenseCategorySubmit" />

            <!-- Expense Form Dialog -->
            <BaseDialog v-model="showExpenseForm" :title="editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'"
                :icon="CurrencyDollarIcon" size="lg">
                <ExpenseForm :expense="editingExpense" :categories="allExpenseCategories" :loading="expenseFormLoading"
                    @submit="handleExpenseSubmit" @cancel="showExpenseForm = false" />
            </BaseDialog>

            <!-- Supplier Form Dialog -->
            <SupplierFormModal :is-open="showSupplierForm" :editing-supplier="editingSupplier"
                :loading="supplierFormLoading" @close="closeSupplierForm" @submit="handleSupplierSubmit" />
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBranchesStore } from '@/store/branches'
import { useBanksStore } from '@/store/banks'
import { useAppsStore } from '@/store/apps'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue'
import BranchUsersTable from '@/components/branches/BranchUsersTable.vue'
import BranchForm from '@/components/branches/BranchForm.vue'
import BankForm from '@/components/payments/banks/BankForm.vue'
import AppForm from '@/components/payments/apps/AppForm.vue'
import ExpenseCategoriesTable from '@/components/expenses/ExpenseCategoriesTable.vue'
import ExpensesTable from '@/components/expenses/ExpensesTable.vue'
import ExpenseCategoryFormModal from '@/components/expenses/ExpenseCategoryFormModal.vue'
import ExpenseForm from '@/components/expenses/ExpenseForm.vue'
import SuppliersTable from '@/components/suppliers/SuppliersTable.vue'
import SupplierFormModal from '@/components/suppliers/SupplierFormModal.vue'
import { expenseCategoryApi } from '@/services/MainAPI/expenseCategoryApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { supplierApi } from '@/services/MainAPI/supplierApi'
import type { ExpenseCategory, CreateExpenseCategoryDto, Expense, CreateExpenseDto, UpdateExpenseDto } from '@/types/expense'
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier'
import type { PagedResult } from '@/types/common'
import {
    BuildingOffice2Icon,
    PencilIcon,
    TrashIcon,
    MapPinIcon,
    PhoneIcon,
    UserGroupIcon,
    MapIcon,
    UsersIcon,
    CalendarIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    BuildingLibraryIcon,
    DevicePhoneMobileIcon,
    CurrencyDollarIcon
} from '@heroicons/vue/24/outline'
import type { User } from '@/types/user'
import type { Bank, BankFormData } from '@/types/bank'
import type { App, AppFormData } from '@/types/bank'

const route = useRoute()
const router = useRouter()
const branchesStore = useBranchesStore()
const banksStore = useBanksStore()
const appsStore = useAppsStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// Reactive state
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showBankForm = ref(false)
const showAppForm = ref(false)
const editingBank = ref<Bank | null>(null)
const editingApp = ref<App | null>(null)

// Expenses state
const expensesActiveTab = ref<'categories' | 'expenses' | 'suppliers'>('categories')
const expenseCategoriesList = ref<PagedResult<ExpenseCategory> | null>(null)
const expenseCategoriesLoading = ref(false)
const expenseCategoriesPage = ref(1)
const expenseCategoriesPageSize = ref(10)
const showExpenseCategoryForm = ref(false)
const editingExpenseCategory = ref<ExpenseCategory | null>(null)
const expenseCategoryFormLoading = ref(false)

const expensesList = ref<PagedResult<Expense> | null>(null)
const expensesLoading = ref(false)
const expensesPage = ref(1)
const expensesPageSize = ref(10)
const expensesCategoryFilter = ref<number | null>(null)
const expensesNameFilter = ref('')
const showExpenseForm = ref(false)
const editingExpense = ref<Expense | null>(null)
const expenseFormLoading = ref(false)
const allExpenseCategories = ref<ExpenseCategory[]>([])

// Suppliers state
const suppliersList = ref<PagedResult<Supplier> | null>(null)
const suppliersLoading = ref(false)
const suppliersPage = ref(1)
const suppliersPageSize = ref(10)
const showSupplierForm = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const supplierFormLoading = ref(false)

const branchId = computed(() => Number(route.params.id))

const branch = computed(() => branchesStore.current)

const canAccessBranch = computed(() => {
    if (!branch.value) return false

    const userRole = authStore.user?.role
    const userBranchId = authStore.user?.branchId

    // Superadmin can access all branches
    if (userRole === 'Superadmin') return true

    // Admin can only access their own branch
    if (userRole === 'Admin') return userBranchId === branch.value.id

    return false
})

const canManageBanks = computed(() => {
    const userRole = authStore.user?.role
    return userRole === 'Superadmin' || userRole === 'Admin'
})

const canManageApps = computed(() => {
    const userRole = authStore.user?.role
    return userRole === 'Superadmin' || userRole === 'Admin'
})

const canManageSuppliers = computed(() => {
    const userRole = authStore.user?.role
    return userRole === 'Superadmin' || userRole === 'Admin'
})

const handleUserError = (message: string) => {
    showError('Error manejando usuario', message)
}

const totalCustomers = computed(() => {
    return branch.value?.neighborhoods?.reduce((total, n) => total + (n.totalCustomers || 0), 0) || 0
})

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

// Actions
const openEditDialog = () => {
    showEditDialog.value = true
}

const confirmDelete = () => {
    showDeleteDialog.value = true
}

const handleEditSubmit = async (formData: any) => {
    try {
        await branchesStore.update(branchId.value, formData)
        showEditDialog.value = false
        success('Sucursal actualizada', 5000, 'La sucursal se ha actualizado correctamente')
    } catch (error: any) {
        console.error('Error updating branch:', error)
        showError('Error al actualizar', error.message || 'No se pudo actualizar la sucursal')
    }
}

const handleDelete = async () => {
    try {
        await branchesStore.remove(branchId.value)
        showDeleteDialog.value = false
        success('Sucursal eliminada', 5000, 'La sucursal se ha eliminado correctamente')
        router.push('/branches')
    } catch (error: any) {
        console.error('Error deleting branch:', error)
        showError('Error al eliminar', error.message || 'No se pudo eliminar la sucursal')
    }
}

const handleUserCreated = (user: User) => {
    // User is already added to the store by the users table component
    success('Usuario creado', 5000, `El usuario ${user.name} se ha creado correctamente`)
}

const handleUserUpdated = (user: User) => {
    // User is already updated in the store by the users table component
    success('Usuario actualizado', 5000, `El usuario ${user.name} se ha actualizado correctamente`)
}

const handleUserStatusToggled = (user: User) => {
    console.log(user)
    // User status is already toggled in the store by the users table component
    const status = user.active ? 'activado' : 'desactivado'
    success('Estado actualizado', 5000, `El usuario ${user.name} ha sido ${status}`)
}

// Bank actions
const openCreateBank = () => {
    editingBank.value = null
    showBankForm.value = true
}

const openEditBank = (bank: Bank) => {
    editingBank.value = bank
    showBankForm.value = true
}

const handleBankSubmit = async (formData: BankFormData) => {
    try {
        if (editingBank.value) {
            await banksStore.update(editingBank.value.id, formData)
            success('Banco actualizado', 3000, `El banco "${formData.name}" se ha actualizado correctamente`)
        } else {
            // For new banks, use branchId from form if provided (superadmin), otherwise use current branch
            const createData = {
                ...formData,
                branchId: formData.branchId || (authStore.isSuperadmin ? undefined : (authStore.branchId || undefined))
            }
            await banksStore.create(createData)
            success('Banco creado', 3000, `El banco "${formData.name}" se ha creado correctamente`)
        }
        showBankForm.value = false
        editingBank.value = null
    } catch (error: any) {
        showError('Error al guardar banco', error.message || 'No se pudo guardar el banco')
    }
}

const deleteBank = async (bank: Bank) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el banco "${bank.name}"?`)) {
        try {
            await banksStore.remove(bank.id)
            success('Banco eliminado', 3000, `El banco "${bank.name}" se ha eliminado correctamente`)
        } catch (error: any) {
            showError('Error al eliminar banco', error.message || 'No se pudo eliminar el banco')
        }
    }
}

// App actions
const openCreateApp = () => {
    editingApp.value = null
    showAppForm.value = true
}

const openEditApp = (app: App) => {
    editingApp.value = app
    showAppForm.value = true
}

const handleAppSubmit = async (formData: AppFormData) => {
    try {
        if (editingApp.value) {
            await appsStore.update(editingApp.value.id, formData)
            success('App actualizada', 3000, `La app "${formData.name}" se ha actualizado correctamente`)
        } else {
            await appsStore.create(formData)
            success('App creada', 3000, `La app "${formData.name}" se ha creado correctamente`)
        }
        showAppForm.value = false
        editingApp.value = null
    } catch (error: any) {
        showError('Error al guardar app', error.message || 'No se pudo guardar la app')
    }
}

const deleteApp = async (app: App) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la app "${app.name}"?`)) {
        try {
            await appsStore.remove(app.id)
            success('App eliminada', 3000, `La app "${app.name}" se ha eliminado correctamente`)
        } catch (error: any) {
            showError('Error al eliminar app', error.message || 'No se pudo eliminar la app')
        }
    }
}

// Suppliers actions
const loadSuppliers = async () => {
    try {
        suppliersLoading.value = true
        const response = await supplierApi.getSuppliers({
            branchId: branchId.value,
            page: suppliersPage.value,
            pageSize: suppliersPageSize.value
        })
        suppliersList.value = response
    } catch (error: any) {
        showError('Error al cargar proveedores', error.message || 'No se pudieron cargar los proveedores')
    } finally {
        suppliersLoading.value = false
    }
}

const openCreateSupplier = () => {
    editingSupplier.value = null
    showSupplierForm.value = true
}

const openEditSupplier = (supplier: Supplier) => {
    editingSupplier.value = supplier
    showSupplierForm.value = true
}

const closeSupplierForm = () => {
    showSupplierForm.value = false
    editingSupplier.value = null
}

const handleSupplierSubmit = async (data: CreateSupplierDto) => {
    try {
        supplierFormLoading.value = true
        if (editingSupplier.value) {
            await supplierApi.updateSupplier(editingSupplier.value.id, data as UpdateSupplierDto)
            success('Proveedor actualizado', 3000, `El proveedor "${data.name}" se ha actualizado correctamente`)
        } else {
            await supplierApi.createSupplier(data, authStore.isSuperadmin ? branchId.value : undefined)
            success('Proveedor creado', 3000, `El proveedor "${data.name}" se ha creado correctamente`)
        }
        closeSupplierForm()
        await loadSuppliers()
    } catch (error: any) {
        showError('Error al guardar proveedor', error.message || 'No se pudo guardar el proveedor')
    } finally {
        supplierFormLoading.value = false
    }
}

const deleteSupplier = async (supplier: Supplier) => {
    if (!canManageSuppliers.value) return
    if (!confirm(`¿Estás seguro de que deseas eliminar el proveedor "${supplier.name}"?`)) return

    try {
        await supplierApi.deleteSupplier(supplier.id)
        success('Proveedor eliminado', 3000, `El proveedor "${supplier.name}" se ha eliminado correctamente`)
        await loadSuppliers()
    } catch (error: any) {
        showError('Error al eliminar proveedor', error.message || 'No se pudo eliminar el proveedor')
    }
}

const previousSupplierPage = async () => {
    if (suppliersList.value?.hasPreviousPage) {
        suppliersPage.value--
        await loadSuppliers()
    }
}

const nextSupplierPage = async () => {
    if (suppliersList.value?.hasNextPage) {
        suppliersPage.value++
        await loadSuppliers()
    }
}

// Expense Categories Methods
const loadExpenseCategories = async () => {
    try {
        expenseCategoriesLoading.value = true
        const response = await expenseCategoryApi.getExpenseCategories({
            page: expenseCategoriesPage.value,
            pageSize: expenseCategoriesPageSize.value
        })
        if (response.isSuccess && response.data) {
            expenseCategoriesList.value = response.data
        }
    } catch (error: any) {
        showError('Error al cargar categorías', error.message || 'No se pudieron cargar las categorías')
    } finally {
        expenseCategoriesLoading.value = false
    }
}

const loadAllExpenseCategories = async () => {
    try {
        const response = await expenseCategoryApi.getAllExpenseCategories()
        if (response.isSuccess && response.data) {
            allExpenseCategories.value = response.data
        }
    } catch (error: any) {
        console.error('Error loading all categories:', error)
    }
}

const openCreateExpenseCategory = () => {
    editingExpenseCategory.value = null
    showExpenseCategoryForm.value = true
}

const openEditExpenseCategory = (category: ExpenseCategory) => {
    editingExpenseCategory.value = category
    showExpenseCategoryForm.value = true
}

const handleExpenseCategorySubmit = async (data: CreateExpenseCategoryDto) => {
    try {
        expenseCategoryFormLoading.value = true
        if (editingExpenseCategory.value) {
            await expenseCategoryApi.updateExpenseCategory(editingExpenseCategory.value.id, data)
            success('Categoría actualizada', 3000, `La categoría "${data.name}" se ha actualizado correctamente`)
        } else {
            await expenseCategoryApi.createExpenseCategory(data)
            success('Categoría creada', 3000, `La categoría "${data.name}" se ha creado correctamente`)
        }
        showExpenseCategoryForm.value = false
        editingExpenseCategory.value = null
        await loadExpenseCategories()
        await loadAllExpenseCategories()
    } catch (error: any) {
        showError('Error al guardar categoría', error.message || 'No se pudo guardar la categoría')
    } finally {
        expenseCategoryFormLoading.value = false
    }
}

const deleteExpenseCategory = async (category: ExpenseCategory) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`)) {
        return
    }
    try {
        await expenseCategoryApi.deleteExpenseCategory(category.id)
        success('Categoría eliminada', 3000, `La categoría "${category.name}" se ha eliminado correctamente`)
        await loadExpenseCategories()
        await loadAllExpenseCategories()
    } catch (error: any) {
        showError('Error al eliminar categoría', error.message || 'No se pudo eliminar la categoría')
    }
}

const previousExpenseCategoryPage = async () => {
    if (expenseCategoriesList.value?.hasPreviousPage) {
        expenseCategoriesPage.value--
        await loadExpenseCategories()
    }
}

const nextExpenseCategoryPage = async () => {
    if (expenseCategoriesList.value?.hasNextPage) {
        expenseCategoriesPage.value++
        await loadExpenseCategories()
    }
}

// Expenses Methods
const loadExpenses = async () => {
    try {
        expensesLoading.value = true
        const response = await expenseApi.getExpenses({
            categoryId: expensesCategoryFilter.value || undefined,
            name: expensesNameFilter.value || undefined,
            page: expensesPage.value,
            pageSize: expensesPageSize.value
        })
        if (response.isSuccess && response.data) {
            expensesList.value = response.data
        }
    } catch (error: any) {
        showError('Error al cargar gastos', error.message || 'No se pudieron cargar los gastos')
    } finally {
        expensesLoading.value = false
    }
}

const openCreateExpense = () => {
    editingExpense.value = null
    showExpenseForm.value = true
}

const openEditExpense = (expense: Expense) => {
    editingExpense.value = expense
    showExpenseForm.value = true
}

const handleExpenseSubmit = async (data: CreateExpenseDto | UpdateExpenseDto) => {
    try {
        expenseFormLoading.value = true
        if (editingExpense.value) {
            await expenseApi.updateExpense(editingExpense.value.id, data as UpdateExpenseDto)
            success('Gasto actualizado', 3000, `El gasto "${data.name}" se ha actualizado correctamente`)
        } else {
            await expenseApi.createExpense(data as CreateExpenseDto)
            success('Gasto creado', 3000, `El gasto "${data.name}" se ha creado correctamente`)
        }
        showExpenseForm.value = false
        editingExpense.value = null
        await loadExpenses()
    } catch (error: any) {
        showError('Error al guardar gasto', error.message || 'No se pudo guardar el gasto')
    } finally {
        expenseFormLoading.value = false
    }
}

const deleteExpense = async (expense: Expense) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el gasto "${expense.name}"?`)) {
        return
    }
    try {
        await expenseApi.deleteExpense(expense.id)
        success('Gasto eliminado', 3000, `El gasto "${expense.name}" se ha eliminado correctamente`)
        await loadExpenses()
    } catch (error: any) {
        showError('Error al eliminar gasto', error.message || 'No se pudo eliminar el gasto')
    }
}

const onExpenseFilterChange = async (categoryId: number | null) => {
    expensesCategoryFilter.value = categoryId
    expensesPage.value = 1
    await loadExpenses()
}

const onExpenseSearchChange = async (name: string) => {
    expensesNameFilter.value = name
    expensesPage.value = 1
    await loadExpenses()
}

const previousExpensePage = async () => {
    if (expensesList.value?.hasPreviousPage) {
        expensesPage.value--
        await loadExpenses()
    }
}

const nextExpensePage = async () => {
    if (expensesList.value?.hasNextPage) {
        expensesPage.value++
        await loadExpenses()
    }
}

// Lifecycle
onMounted(async () => {
    try {
        // Check if user has access before making API calls
        const userRole = authStore.user?.role
        const userBranchId = authStore.user?.branchId

        const hasAccess = userRole === 'Superadmin' || (userRole === 'Admin' && userBranchId === branchId.value)

        if (!hasAccess) {
            return
        }

        // Fetch branch details
        await branchesStore.fetchById(branchId.value)

        // Fetch banks for this branch
        await banksStore.fetch({
            page: 1,
            pageSize: 100,
            branchId: branchId.value
        })

        // Fetch apps for this branch
        await appsStore.fetch({
            page: 1,
            pageSize: 100,
            branchId: branchId.value
        })

        await loadExpenseCategories()
        await loadAllExpenseCategories()
        await loadExpenses()
        await loadSuppliers()

    } catch (error: any) {
        console.error('Error loading branch data:', error)
        showError("Error al  cargar datos", error.message || "Error al cargas las sucursales")
        // Could redirect to branches list or show error
    }
})
</script>