<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="editingExpense ? `Editar Gasto #${editingExpense.id}` : 'Nuevo Gasto'" size="4xl">
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Selección de Proveedor -->
            <div>
                <div class="flex items-start gap-2 mb-2">
                    <label class="block text-sm font-medium text-gray-700">
                        Proveedor <span class="text-red-500">*</span>
                    </label>
                    <BaseButton v-if="canManageSuppliers" type="button" size="sm" variant="secondary" class="ml-auto"
                        @click="openSupplierModal">
                        <PlusIcon class="w-4 h-4 mr-1" />
                        Nuevo
                    </BaseButton>
                </div>
                <BaseSelect v-model="formData.supplierId" :options="supplierOptions" searchable
                    :placeholder="suppliersLoading ? 'Cargando proveedores...' : 'Seleccionar proveedor...'"
                    value-key="value" display-key="label" required :disabled="suppliersLoading" />
                <p class="text-xs text-gray-500 mt-1">
                    Gestiona tus proveedores desde la vista de sucursal o crea uno al vuelo.
                </p>
            </div>

            <!-- Detalles del Gasto -->
            <div>
                <div class="flex items-center justify-between mb-3">
                    <label class="block text-sm font-medium text-gray-700">
                        Detalles del Gasto <span class="text-red-500">*</span>
                    </label>
                    <BaseButton type="button" variant="secondary" size="sm" @click="addDetail">
                        <PlusIcon class="w-4 h-4 mr-1" />
                        Agregar
                    </BaseButton>
                </div>

                <div v-if="formData.expenseDetails.length === 0"
                    class="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                    <p>No hay detalles agregados</p>
                    <p class="text-xs mt-1">Haz clic en "Agregar" para comenzar</p>
                </div>

                <div v-else>
                    <!-- Header de columnas -->
                    <div class="flex items-center gap-2 mb-2 pb-2 border-b border-gray-300">
                        <div class="flex-1 min-w-[220px]">
                            <span class="text-xs font-semibold text-gray-700 uppercase">Gasto</span>
                        </div>
                        <div class="w-20">
                            <span class="text-xs font-semibold text-gray-700 uppercase">Cant.</span>
                        </div>
                        <div class="w-28">
                            <span class="text-xs font-semibold text-gray-700 uppercase">Total</span>
                        </div>
                        <div class="w-28">
                            <span class="text-xs font-semibold text-gray-700 uppercase">Unit.</span>
                        </div>
                        <div class="w-10"></div>
                    </div>

                    <!-- Filas de gastos -->
                    <div class="space-y-1.5">
                        <div v-for="(detail, index) in formData.expenseDetails" :key="detail.tempId"
                            class="flex items-center gap-2 border rounded-md p-2 bg-white hover:bg-gray-50 transition-colors">
                            <!-- Gasto (más ancho) -->
                            <div class="flex-1 min-w-[220px]">
                                <BaseSelect v-model="detail.expenseId" :options="expenseOptions"
                                    placeholder="Buscar gasto..." value-key="value" display-key="label" searchable
                                    required @update:model-value="onExpenseSelected(index, $event)" />
                            </div>

                            <!-- Cantidad -->
                            <div class="w-20">
                                <BaseInput v-model.number="detail.quantity" type="number" :min="1" required
                                    @input="updateUnitPrice(index)" />
                            </div>

                            <!-- Total -->
                            <div class="w-28">
                                <BaseInput :model-value="detail.total || 0"
                                    @update:model-value="(val) => { detail.total = Number(val) || 0; updateUnitPrice(index) }"
                                    type="number" :min="0" step="100" required />
                            </div>

                            <!-- Precio Unitario (calculado) -->
                            <div class="w-28">
                                <div
                                    class="px-2 py-1.5 bg-gray-100 rounded-md text-xs text-gray-700 border border-gray-300 text-right font-medium">
                                    {{ formatCurrency(calculateUnitPrice(detail)) }}
                                </div>
                            </div>

                            <!-- Botón eliminar -->
                            <div class="w-10 flex justify-center">
                                <BaseButton type="button" variant="ghost" size="sm" @click="removeDetail(index)"
                                    class="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5">
                                    <TrashIcon class="w-4 h-4" />
                                </BaseButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Métodos de Pago -->
            <div>
                <div class="flex items-center justify-between mb-3">
                    <label class="block text-sm font-medium text-gray-700">
                        Métodos de Pago (Opcional)
                    </label>
                    <BaseButton type="button" variant="secondary" size="sm" @click="addBankPayment">
                        <PlusIcon class="w-4 h-4 mr-1" />
                        Agregar Pago
                    </BaseButton>
                </div>

                <div v-if="formData.expenseBankPayments.length === 0" class="text-sm text-gray-500 italic mb-3">
                    Sin pagos bancarios (se registrará como efectivo)
                </div>

                <div v-else class="space-y-2">
                    <div v-for="(payment, index) in formData.expenseBankPayments" :key="payment.tempId"
                        class="flex items-center gap-3 border rounded-lg p-3 bg-blue-50">
                        <div class="flex-1">
                            <BaseSelect v-model="payment.bankId" :options="bankOptions"
                                placeholder="Seleccionar banco..." value-key="value" display-key="label" />
                        </div>
                        <div class="w-32">
                            <BaseInput v-model.number="payment.amount" type="number" :min="0" step="1000"
                                placeholder="Monto" />
                        </div>
                        <BaseButton type="button" variant="ghost" size="sm" @click="removeBankPayment(index)">
                            <TrashIcon class="w-4 h-4 text-red-600" />
                        </BaseButton>
                    </div>
                </div>

                <!-- Resumen de Pagos (siempre visible) -->
                <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div class="flex justify-between text-sm">
                        <span class="font-medium text-gray-700">Total Gastos:</span>
                        <span class="font-semibold text-gray-900">{{ formatCurrency(totalExpenses) }}</span>
                    </div>
                    <div v-if="formData.expenseBankPayments.length > 0" class="flex justify-between text-sm mt-2">
                        <span class="font-medium text-gray-700">Total Pagos Bancarios:</span>
                        <span class="font-semibold text-blue-600">{{ formatCurrency(totalBankPayments) }}</span>
                    </div>
                    <div class="flex justify-between text-sm mt-2 pt-2 border-t border-gray-300">
                        <span class="font-medium text-gray-700">
                            {{ formData.expenseBankPayments.length > 0 ? 'Diferencia (Efectivo):' : 'Total a Pagar                            (Efectivo):' }}
                        </span>
                        <span class="font-semibold" :class="cashDifference >= 0 ? 'text-green-600' : 'text-red-600'">
                            {{ formatCurrency(cashDifference) }}
                        </span>
                    </div>
                    <p v-if="cashDifference < 0" class="text-xs text-red-600 mt-2">
                        ⚠️ Los pagos bancarios exceden el total
                    </p>
                </div>
            </div>
        </form>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cancelar
            </BaseButton>
            <BaseButton @click="handleSubmit" variant="primary" :loading="loading" :disabled="!isFormValid">
                {{ editingExpense ? 'Actualizar' : 'Crear' }} Gasto
            </BaseButton>
        </template>
    </BaseDialog>

    <BaseDialog v-model="showSupplierModal" title="Nuevo proveedor" size="md">
        <form @submit.prevent="handleSupplierCreate" class="space-y-4">
            <BaseInput v-model="newSupplier.name" label="Nombre" placeholder="Nombre del proveedor" required />
            <BaseInput v-model="newSupplier.phone" label="Teléfono" placeholder="Teléfono" required />
            <BaseInput v-model="newSupplier.address" label="Dirección (opcional)" />
            <BaseInput v-model="newSupplier.email" label="Email (opcional)" type="email" />

            <div class="flex justify-end space-x-2 pt-2">
                <BaseButton type="button" variant="secondary" @click="showSupplierModal = false"
                    :disabled="supplierFormLoading">
                    Cancelar
                </BaseButton>
                <BaseButton type="submit" variant="primary" :loading="supplierFormLoading">
                    Guardar
                </BaseButton>
            </div>
        </form>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ExpenseHeader, CreateExpenseHeaderDto, UpdateExpenseHeaderDto, CreateExpenseDetailDto, CreateExpenseBankPaymentDto } from '@/types/expense'
import type { Supplier, CreateSupplierDto } from '@/types/supplier'
import { expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { supplierApi } from '@/services/MainAPI/supplierApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/store/auth'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

interface Props {
    isOpen: boolean
    editingExpense?: ExpenseHeader | null
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    editingExpense: null,
    loading: false
})

const emit = defineEmits<{
    'close': []
    'submit': [expense: ExpenseHeader]
}>()

const { formatCurrency } = useFormatting()
const { error, success } = useToast()
const authStore = useAuthStore()

// Estado del formulario
const formData = ref<{
    supplierId: number | null
    expenseDetails: Array<CreateExpenseDetailDto & {
        tempId: string
        expenseName: string
        expenseUnit?: string
        total?: number  // Total ingresado por el usuario
    }>
    expenseBankPayments: Array<CreateExpenseBankPaymentDto & { tempId: string }>
}>({
    supplierId: null,
    expenseDetails: [],
    expenseBankPayments: [],
})

// Opciones
const supplierOptions = ref<Array<{ value: number; label: string }>>([])
const bankOptions = ref<Array<{ value: number; label: string }>>([])
const expenseOptions = ref<Array<{ value: number; label: string; description?: string }>>([])
const suppliersLoading = ref(false)
const showSupplierModal = ref(false)
const supplierFormLoading = ref(false)
interface SupplierFormState {
    name: string
    phone: string
    address: string
    email: string
}

const newSupplier = ref<SupplierFormState>({
    name: '',
    phone: '',
    address: '',
    email: ''
})

// Cargar datos iniciales
onMounted(async () => {
    // Cargar bancos
    try {
        const banks = await bankApi.getBanks({ page: 1, pageSize: 100 })
        bankOptions.value = banks.items.map(bank => ({ value: bank.id, label: bank.name }))
    } catch (err) {
        console.error('Error loading banks:', err)
    }

    // Cargar gastos disponibles
    try {
        const response = await expenseApi.getAllExpenses()
        if (response.isSuccess && response.data) {
            expenseOptions.value = response.data.map(expense => ({
                value: expense.id,
                label: `${expense.name} - ${expense.unitDisplay}`, // Mostrar nombre y unidad juntos
                description: expense.categoryName
            }))
        }
    } catch (err) {
        console.error('Error loading expenses:', err)
    }

    await loadSuppliers()
})

// Inicializar formulario cuando se abre el modal
watch(() => props.isOpen, async (isOpen) => {
    if (isOpen) {
        if (props.editingExpense) {
            // Modo edición
            const details = await Promise.all(
                props.editingExpense.expenseDetails.map(async (detail) => {
                    // Calcular el total desde el unitario y cantidad
                    const total = detail.amount * detail.quantity

                    // Cargar la unidad del gasto y actualizar el nombre para mostrar "nombre - unidad"
                    let expenseUnit = detail.expenseUnit
                    let expenseName = detail.expenseName

                    if (detail.expenseId > 0) {
                        try {
                            const response = await expenseApi.getExpenseById(detail.expenseId)
                            if (response.isSuccess && response.data) {
                                expenseUnit = response.data.unitDisplay
                                expenseName = `${response.data.name} - ${response.data.unitDisplay}`
                            }
                        } catch (err) {
                            console.error('Error loading expense unit:', err)
                        }
                    }

                    return {
                        expenseId: detail.expenseId,
                        quantity: detail.quantity,
                        amount: detail.amount,
                        total: total,
                        tempId: `detail-${detail.id}`,
                        expenseName: expenseName,
                        expenseUnit: expenseUnit,
                    }
                })
            )

            formData.value = {
                supplierId: props.editingExpense.supplierId,
                expenseDetails: details,
                expenseBankPayments: props.editingExpense.expenseBankPayments.map(payment => ({
                    bankId: payment.bankId,
                    amount: payment.amount,
                    tempId: `payment-${payment.id}`,
                })),
            }
            await ensureSupplierOption(formData.value.supplierId)
        } else {
            // Modo creación
            formData.value = {
                supplierId: null,
                expenseDetails: [],
                expenseBankPayments: [],
            }
            if (supplierOptions.value.length === 0) {
                await loadSuppliers()
            }
        }
    }
})

// Computed
const totalExpenses = computed(() => {
    return formData.value.expenseDetails.reduce((sum, detail) => sum + (detail.quantity * detail.amount), 0)
})

const totalBankPayments = computed(() => {
    return formData.value.expenseBankPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
})

const cashDifference = computed(() => {
    return totalExpenses.value - totalBankPayments.value
})

const isFormValid = computed(() => {
    return formData.value.supplierId !== null &&
        formData.value.expenseDetails.length > 0 &&
        formData.value.expenseDetails.every(d => d.expenseId > 0 && d.quantity > 0 && (d.total || 0) > 0) &&
        cashDifference.value >= 0
})

const canManageSuppliers = computed(() => {
    const role = authStore.user?.role
    return role === 'Superadmin' || role === 'Admin'
})

// Métodos
const loadSuppliers = async () => {
    try {
        suppliersLoading.value = true
        const suppliers = await supplierApi.getSuppliersByBranch()
        supplierOptions.value = suppliers.map(supplier => ({
            value: supplier.id,
            label: `${supplier.name} • ${supplier.phone}`
        }))
        await ensureSupplierOption(formData.value.supplierId, suppliers)
    } catch (err) {
        console.error('Error loading suppliers:', err)
    } finally {
        suppliersLoading.value = false
    }
}

const ensureSupplierOption = async (supplierId: number | null, existingSuppliers?: Supplier[]) => {
    if (!supplierId) {
        return
    }

    if (supplierOptions.value.some(option => option.value === supplierId)) {
        return
    }

    let supplier: Supplier | undefined = existingSuppliers?.find(s => s.id === supplierId)

    if (!supplier) {
        try {
            supplier = await supplierApi.getSupplierById(supplierId)
        } catch (err) {
            console.error('Error fetching supplier by id:', err)
        }
    }

    if (supplier) {
        supplierOptions.value.push({
            value: supplier.id,
            label: `${supplier.name} • ${supplier.phone}`
        })
    }
}

const openSupplierModal = () => {
    newSupplier.value = {
        name: '',
        phone: '',
        address: '',
        email: ''
    }
    showSupplierModal.value = true
}

const handleSupplierCreate = async () => {
    if (!newSupplier.value.name.trim() || !newSupplier.value.phone.trim()) {
        error('Formulario inválido', 'Nombre y teléfono son obligatorios.')
        return
    }

    try {
        supplierFormLoading.value = true
        const payload: CreateSupplierDto = {
            name: newSupplier.value.name.trim(),
            phone: newSupplier.value.phone.trim(),
        }

        if (newSupplier.value.address?.trim()) {
            payload.address = newSupplier.value.address.trim()
        }

        if (newSupplier.value.email?.trim()) {
            payload.email = newSupplier.value.email.trim()
        }

        const createdSupplier = await supplierApi.createSupplier(payload, authStore.isSuperadmin ? authStore.branchId ?? undefined : undefined)

        supplierOptions.value.unshift({
            value: createdSupplier.id,
            label: `${createdSupplier.name} • ${createdSupplier.phone}`
        })
        formData.value.supplierId = createdSupplier.id
        showSupplierModal.value = false
        success('Proveedor creado', 3000, `El proveedor "${createdSupplier.name}" se ha creado correctamente`)
    } catch (err: any) {
        error('Error al crear proveedor', err.message || 'No se pudo crear el proveedor')
    } finally {
        supplierFormLoading.value = false
    }
}

const onExpenseSelected = async (index: number, expenseId: number) => {
    const expense = expenseOptions.value.find(e => e.value === expenseId)
    if (expense && formData.value.expenseDetails[index]) {
        // Cargar la unidad del gasto y actualizar el nombre para mostrar "nombre - unidad"
        try {
            const response = await expenseApi.getExpenseById(expenseId)
            if (response.isSuccess && response.data) {
                formData.value.expenseDetails[index].expenseUnit = response.data.unitDisplay
                formData.value.expenseDetails[index].expenseName = `${response.data.name} - ${response.data.unitDisplay}`

                // Actualizar también la opción en el selector para que se muestre con la unidad
                const optionIndex = expenseOptions.value.findIndex(e => e.value === expenseId)
                if (optionIndex !== -1) {
                    expenseOptions.value[optionIndex].label = `${response.data.name} - ${response.data.unitDisplay}`
                }
            } else {
                formData.value.expenseDetails[index].expenseName = expense.label
            }
        } catch (err) {
            console.error('Error loading expense details:', err)
            formData.value.expenseDetails[index].expenseName = expense.label
        }
    }
}

const calculateUnitPrice = (detail: typeof formData.value.expenseDetails[0]) => {
    if (!detail.total || !detail.quantity || detail.quantity === 0) {
        return 0
    }
    return Math.round(detail.total / detail.quantity)
}

const updateUnitPrice = (index: number) => {
    // El precio unitario se calcula automáticamente, no necesitamos hacer nada aquí
    // Solo asegurarnos de que el cálculo se actualice
    const detail = formData.value.expenseDetails[index]
    if (detail && detail.total && detail.quantity && detail.quantity > 0) {
        detail.amount = calculateUnitPrice(detail)
    }
}

const addDetail = () => {
    formData.value.expenseDetails.push({
        expenseId: 0,
        quantity: 1,
        amount: 0,
        total: 0,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        expenseName: '',
        expenseUnit: undefined,
    })
}

const removeDetail = (index: number) => {
    formData.value.expenseDetails.splice(index, 1)
}

const addBankPayment = () => {
    formData.value.expenseBankPayments.push({
        bankId: 0,
        amount: 0,
        tempId: `temp-${Date.now()}-${Math.random()}`,
    })
}

const removeBankPayment = (index: number) => {
    formData.value.expenseBankPayments.splice(index, 1)
}

const handleSubmit = async () => {
    if (!isFormValid.value) {
        error('Formulario inválido', 'Por favor completa todos los campos requeridos')
        return
    }

    try {
        const payload: CreateExpenseHeaderDto | UpdateExpenseHeaderDto = {
            supplierId: formData.value.supplierId!,
            expenseDetails: formData.value.expenseDetails.map(d => ({
                expenseId: d.expenseId,
                quantity: d.quantity,
                amount: d.amount,
            })),
            expenseBankPayments: formData.value.expenseBankPayments.length > 0
                ? formData.value.expenseBankPayments.map(p => ({
                    bankId: p.bankId,
                    amount: p.amount,
                }))
                : undefined,
        }

        let result: ExpenseHeader
        if (props.editingExpense) {
            result = await expenseHeaderApi.updateExpenseHeader(props.editingExpense.id, payload as UpdateExpenseHeaderDto)
        } else {
            result = await expenseHeaderApi.createExpenseHeader(payload as CreateExpenseHeaderDto)
        }

        emit('submit', result)
    } catch (err: any) {
        error('Error al guardar', err.message)
    }
}
</script>
