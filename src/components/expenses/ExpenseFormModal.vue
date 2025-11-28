<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="editingExpense ? `Editar Gasto #${editingExpense.id}` : 'Nuevo Gasto'" size="4xl">
        <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Selección de Proveedor -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Proveedor <span class="text-red-500">*</span>
                </label>
                <BaseSelect v-model="formData.supplierId" :options="supplierOptions"
                    placeholder="Seleccionar proveedor..." value-key="value" display-key="label" required />
                <p class="text-xs text-gray-500 mt-1">
                    Nota: Los proveedores se cargarán desde los gastos existentes. Se necesita crear API de proveedores.
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

                <div v-else class="space-y-3">
                    <div v-for="(detail, index) in formData.expenseDetails" :key="detail.tempId"
                        class="border rounded-lg p-4 bg-gray-50">
                        <div class="flex items-start justify-between mb-3">
                            <h5 class="text-sm font-medium text-gray-700">Detalle {{ index + 1 }}</h5>
                            <BaseButton type="button" variant="ghost" size="sm" @click="removeDetail(index)">
                                <TrashIcon class="w-4 h-4 text-red-600" />
                            </BaseButton>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Gasto</label>
                                <BaseInput v-model="detail.expenseName" placeholder="Nombre del gasto..." required />
                                <p class="text-xs text-gray-400 mt-1">
                                    Nota: Se necesita API de expenses para autocompletado
                                </p>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                                <BaseInput v-model.number="detail.quantity" type="number" :min="1" required />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-600 mb-1">Precio Unitario</label>
                                <BaseInput v-model.number="detail.amount" type="number" :min="0" step="100" required />
                            </div>
                        </div>
                        <div class="mt-2 text-sm text-gray-600">
                            Total: <span class="font-semibold">{{ formatCurrency(detail.quantity * detail.amount)
                                }}</span>
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

                <div v-if="formData.expenseBankPayments.length === 0" class="text-sm text-gray-500 italic">
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

                <!-- Resumen de Pagos -->
                <div v-if="formData.expenseBankPayments.length > 0" class="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Total Pagos Bancarios:</span>
                        <span class="font-semibold">{{ formatCurrency(totalBankPayments) }}</span>
                    </div>
                    <div class="flex justify-between text-sm mt-1">
                        <span class="text-gray-600">Total Gastos:</span>
                        <span class="font-semibold">{{ formatCurrency(totalExpenses) }}</span>
                    </div>
                    <div class="flex justify-between text-sm mt-1 border-t pt-1">
                        <span class="text-gray-600">Diferencia (Efectivo):</span>
                        <span class="font-semibold" :class="cashDifference >= 0 ? 'text-emerald-600' : 'text-red-600'">
                            {{ formatCurrency(cashDifference) }}
                        </span>
                    </div>
                    <p v-if="cashDifference < 0" class="text-xs text-red-600 mt-1">
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ExpenseHeader, CreateExpenseHeaderDto, UpdateExpenseHeaderDto, CreateExpenseDetailDto, CreateExpenseBankPaymentDto } from '@/types/expense'
import { expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
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
const { error } = useToast()

// Estado del formulario
const formData = ref<{
    supplierId: number | null
    expenseDetails: Array<CreateExpenseDetailDto & { tempId: string; expenseName: string }>
    expenseBankPayments: Array<CreateExpenseBankPaymentDto & { tempId: string }>
}>({
    supplierId: null,
    expenseDetails: [],
    expenseBankPayments: [],
})

// Opciones
const supplierOptions = ref<Array<{ value: number; label: string }>>([])
const bankOptions = ref<Array<{ value: number; label: string }>>([])

// Cargar datos iniciales
onMounted(async () => {
    // Cargar bancos
    try {
        const banks = await bankApi.getBanks({ page: 1, pageSize: 100 })
        bankOptions.value = banks.items.map(bank => ({ value: bank.id, label: bank.name }))
    } catch (err) {
        console.error('Error loading banks:', err)
    }

    // TODO: Cargar proveedores cuando se cree la API
    // Por ahora, se pueden obtener de los expense headers existentes
})

// Inicializar formulario cuando se abre el modal
watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        if (props.editingExpense) {
            // Modo edición
            formData.value = {
                supplierId: props.editingExpense.supplierId,
                expenseDetails: props.editingExpense.expenseDetails.map(detail => ({
                    expenseId: detail.expenseId,
                    quantity: detail.quantity,
                    amount: detail.amount,
                    tempId: `detail-${detail.id}`,
                    expenseName: detail.expenseName,
                })),
                expenseBankPayments: props.editingExpense.expenseBankPayments.map(payment => ({
                    bankId: payment.bankId,
                    amount: payment.amount,
                    tempId: `payment-${payment.id}`,
                })),
            }
        } else {
            // Modo creación
            formData.value = {
                supplierId: null,
                expenseDetails: [],
                expenseBankPayments: [],
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
        cashDifference.value >= 0
})

// Métodos
const addDetail = () => {
    formData.value.expenseDetails.push({
        expenseId: 0, // TODO: Se necesita seleccionar de una lista
        quantity: 1,
        amount: 0,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        expenseName: '', // TODO: Se necesita autocompletado
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
