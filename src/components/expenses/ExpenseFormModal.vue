<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="editingExpense ? `Editar Gasto #${editingExpense.id}` : 'Nuevo Gasto'" size="4xl">
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Proveedor -->
            <div class="rounded-xl border border-gray-200/80 bg-gray-50/40 px-3 py-2.5">
                <div class="flex flex-wrap items-end gap-2">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                            Proveedor <span class="text-red-500">*</span>
                        </label>
                        <BaseSelect v-model="formData.supplierId" :options="supplierOptions" searchable allow-create
                            size="sm"
                            :placeholder="suppliersLoading ? 'Cargando…' : 'Buscar o crear…'"
                            value-key="value" display-key="label" required :disabled="suppliersLoading"
                            @create="onSupplierCreateFromSearch" />
                    </div>
                    <BaseButton type="button" variant="outline" size="sm" class="shrink-0 text-xs"
                        :disabled="suppliersLoading" @click="applyGeneralSupplier">
                        Proveedor general
                    </BaseButton>
                </div>
            </div>

            <!-- Líneas -->
            <div class="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div
                    class="flex flex-nowrap items-center gap-2 mb-2 pb-2 border-b border-gray-100/90 overflow-x-auto min-h-8"
                >
                    <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">
                        Líneas <span class="text-red-500">*</span>
                    </label>
                    <BaseButton type="button" variant="secondary" size="sm" class="text-xs h-8 shrink-0" @click="addDetail">
                        <PlusIcon class="w-3.5 h-3.5 shrink-0" />
                        Agregar
                    </BaseButton>
                    <template v-if="supplierHasFavoriteExpenses">
                        <span class="h-3.5 w-px bg-emerald-200/90 shrink-0" aria-hidden="true" />
                        <div class="flex items-center gap-1.5 text-[11px] text-emerald-800 min-w-0 flex-1">
                            <SparklesIcon class="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span class="truncate">
                                {{
                                    showAllSupplierExpenses
                                        ? 'Todos los gastos (frecuentes primero).'
                                        : 'Gastos frecuentes del proveedor.'
                                }}
                            </span>
                        </div>
                        <BaseButton type="button" variant="ghost" size="sm"
                            class="text-emerald-800 hover:bg-emerald-100/80 text-xs h-7 px-2 shrink-0"
                            @click="toggleExpenseOptionMode">
                            {{ showAllSupplierExpenses ? 'Solo frecuentes' : 'Ver todos' }}
                        </BaseButton>
                    </template>
                    <p v-else-if="supplierExpensesLoading" class="text-[11px] text-gray-500 shrink-0 whitespace-nowrap">
                        Cargando sugerencias…
                    </p>
                </div>

                <div v-if="formData.expenseDetails.length === 0"
                    class="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                    <p class="text-sm">Sin líneas</p>
                    <p class="text-[11px] mt-0.5">Usa <span class="font-medium">Agregar</span> para la primera.</p>
                </div>

                <div v-else>
                    <div class="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-gray-200/90">
                        <div class="flex-1 min-w-[220px]">
                            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Gasto</span>
                        </div>
                        <div class="w-20">
                            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Cant.</span>
                        </div>
                        <div class="w-28">
                            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                        </div>
                        <div class="w-28">
                            <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Unit.</span>
                        </div>
                        <div class="w-[4.5rem] shrink-0" aria-hidden="true"></div>
                    </div>

                    <div class="space-y-2">
                        <div v-for="(detail, index) in formData.expenseDetails" :key="detail.tempId"
                            class="border border-gray-100 rounded-lg p-1.5 bg-gray-50/30 space-y-1.5 shadow-sm"
                            :data-expense-line-id="detail.detailId != null && detail.detailId > 0 ? detail.detailId : undefined">
                            <div class="flex items-center gap-1.5 hover:bg-white/80 transition-colors -m-0.5 p-1 rounded-md">
                            <!-- Gasto (más ancho) -->
                            <div class="flex-1 min-w-[220px]">
                                <BaseSelect v-model="detail.expenseId" :options="prioritizedExpenseOptions"
                                    size="sm"
                                    :placeholder="expenseSelectPlaceholder" value-key="value" display-key="label" searchable
                                    allow-create required @update:model-value="onExpenseSelected(index, $event)"
                                    @create="onExpenseCreateFromSearch(index, $event)" />
                            </div>

                            <!-- Cantidad -->
                            <div class="w-20">
                                <BaseInput v-model.number="detail.quantity" type="number" size="sm" :min="0.01" step="0.01" required
                                    @input="updateDerivedUnitAmount(index)" />
                            </div>

                            <!-- Total -->
                            <div class="w-28">
                                <BaseInput :model-value="detail.total ?? 0"
                                    @update:model-value="(val) => { detail.total = parseLineTotal(val); updateDerivedUnitAmount(index) }"
                                    type="number" size="sm" :min="0" step="0.01" required />
                            </div>

                            <div class="w-28">
                                <div
                                    class="px-1.5 py-1 bg-white rounded-md text-[11px] text-gray-700 border border-gray-200 text-right font-medium tabular-nums"
                                    :title="'Referencia: total ÷ cantidad'">
                                    {{ formatUnitRef(calculateUnitPriceRef(detail)) }}
                                </div>
                            </div>

                            <div class="flex items-center justify-end gap-0 shrink-0">
                                <BaseButton
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/80 p-1"
                                    :class="{ 'text-emerald-700 bg-emerald-50/60': lineNotesOpen[detail.tempId] }"
                                    :title="lineNotesOpen[detail.tempId] ? 'Ocultar nota de línea' : 'Nota en esta línea'"
                                    @click="toggleLineNotes(detail.tempId)"
                                >
                                    <ChatBubbleLeftRightIcon class="w-3.5 h-3.5" />
                                </BaseButton>
                                <BaseButton type="button" variant="ghost" size="sm" @click="removeDetail(index)"
                                    class="text-red-600 hover:text-red-700 hover:bg-red-50 p-1">
                                    <TrashIcon class="w-3.5 h-3.5" />
                                </BaseButton>
                            </div>
                            </div>
                            <div
                                v-show="lineNotesOpen[detail.tempId]"
                                class="pt-1.5 mt-0.5 border-t border-gray-100/80"
                            >
                                <label class="text-[11px] font-medium text-gray-500">Nota de línea (opcional)</label>
                                <textarea
                                    v-model="detail.notes"
                                    rows="2"
                                    maxlength="1000"
                                    class="w-full mt-0.5 border border-gray-200 rounded-md px-2 py-1 text-[11px] leading-snug focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
                                    placeholder="Nota de línea…"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="rounded-xl border border-amber-100/80 bg-amber-50/35 px-3 py-2">
                <label class="inline-flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                    <input v-model="applyVat" type="checkbox" class="rounded border-gray-300 mt-0.5 shrink-0" />
                    <span>
                        <span class="font-medium">IVA 19%</span>
                        <span class="block text-[11px] text-gray-600 mt-0.5 leading-snug">
                            Sobre subtotal de líneas; total factura y pagos incluyen IVA si aplica.
                        </span>
                    </span>
                </label>
            </div>

            <div class="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-sm">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Pagos (opcional)
                    </label>
                    <BaseButton type="button" variant="secondary" size="sm" class="text-xs h-8" @click="addBankPayment">
                        <PlusIcon class="w-3.5 h-3.5 shrink-0" />
                        Agregar
                    </BaseButton>
                </div>

                <div v-if="formData.expenseBankPayments.length === 0" class="text-xs text-gray-500 italic mb-2">
                    Sin transferencias → se registra como efectivo.
                </div>

                <div v-else class="space-y-1.5">
                    <div v-for="(payment, index) in formData.expenseBankPayments" :key="payment.tempId"
                        class="flex items-center gap-2 border border-blue-100/80 rounded-lg p-2 bg-blue-50/40">
                        <div class="flex-1">
                            <BaseSelect v-model="payment.bankId" :options="bankOptions" size="sm"
                                placeholder="Banco…" value-key="value" display-key="label"
                                @update:model-value="onBankPaymentBankSelected(index)" />
                        </div>
                        <div class="w-32">
                            <BaseInput v-model.number="payment.amount" type="number" size="sm" :min="0" step="1000"
                                placeholder="Monto" @input="clearBankPaymentSync(index)" />
                        </div>
                        <BaseButton type="button" variant="ghost" size="sm" @click="removeBankPayment(index)">
                            <TrashIcon class="w-4 h-4 text-red-600" />
                        </BaseButton>
                    </div>
                </div>

                <div class="mt-2 p-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
                    <div class="flex justify-between text-sm">
                        <span class="font-medium text-gray-700">Subtotal de líneas:</span>
                        <span class="font-semibold text-gray-900">{{ formatCurrency(totalExpenses) }}</span>
                    </div>
                    <div v-if="applyVat" class="flex justify-between text-sm mt-1">
                        <span class="font-medium text-gray-700">IVA (19%):</span>
                        <span class="font-semibold text-gray-800">{{ formatCurrency(invoiceVatAmount) }}</span>
                    </div>
                    <div class="flex justify-between text-sm mt-1 pt-1 border-t border-gray-200">
                        <span class="font-medium text-gray-900">Total factura:</span>
                        <span class="font-semibold text-indigo-700">{{ formatCurrency(invoiceGrossTotal) }}</span>
                    </div>
                    <div v-if="formData.expenseBankPayments.length > 0" class="flex justify-between text-sm mt-2">
                        <span class="font-medium text-gray-700">Total Pagos Bancarios:</span>
                        <span class="font-semibold text-blue-600">{{ formatCurrency(totalBankPayments) }}</span>
                    </div>
                    <div class="flex justify-between text-sm mt-2 pt-2 border-t border-gray-300">
                        <span class="font-medium text-gray-700">
                            {{ formData.expenseBankPayments.length > 0 ? 'Diferencia (Efectivo):' : 'Total a Pagar                                (Efectivo): ' }}
                        </span>
                        <span class="font-semibold" :class="cashDifference >= 0 ? 'text-green-600' : 'text-red-600'">
                            {{ formatCurrency(cashDifference) }}
                        </span>
                    </div>
                    <p v-if="cashDifference < 0" class="text-[11px] text-red-600 mt-1.5">
                        Los pagos bancarios exceden el total.
                    </p>
                </div>
            </div>

            <div class="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 shadow-sm">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Notas del comprobante (opcional)
                </label>
                <textarea
                    v-model="formData.notes"
                    rows="2"
                    maxlength="2000"
                    class="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs leading-snug focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400"
                    placeholder="Referencia de factura, acuerdos…"
                />
                <p class="text-[11px] text-gray-400 mt-0.5 tabular-nums">{{ (formData.notes || '').length }}/2000</p>
            </div>

            <!-- Abono a domiciliario -->
            <div v-if="skipAutoAdvance && presetDeliverymanId" class="border-t border-gray-200 pt-3">
                <p class="text-xs text-blue-900 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    Gasto imputado al domiciliario en liquidación. El abono contable se registra al confirmar la liquidación.
                </p>
            </div>
            <div v-else-if="editingExpense?.deliverymanId" class="border-t border-gray-200 pt-3 space-y-2">
                <p class="text-sm font-semibold text-gray-800">Abono de domiciliario</p>
                <div class="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-sm text-gray-800">
                    <span class="font-medium">{{ editingExpense.deliverymanName || `Domiciliario #${editingExpense.deliverymanId}` }}</span>
                    <template v-if="editingExpense.linkedDeliverymanAdvanceId">
                        <span class="block text-xs text-gray-600 mt-1">
                            Abono vinculado #{{ editingExpense.linkedDeliverymanAdvanceId }} ·
                            {{ formatCurrency(Number(editingExpense.linkedDeliverymanAdvanceAmount ?? 0)) }}
                        </span>
                    </template>
                    <p v-else class="text-xs text-amber-800 mt-1">
                        Este gasto tiene domiciliario asociado. Si el abono se creó antes del vínculo automático,
                        revísalo en domiciliarios si cambias el total.
                    </p>
                </div>
                    <p v-if="willSyncLinkedAdvanceOnSave" class="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Al guardar se pedirá confirmación para actualizar el abono vinculado al nuevo total
                    ({{ formatCurrency(invoiceGrossTotal) }}).
                </p>
            </div>
            <div v-else class="border-t border-gray-200 pt-3 space-y-2">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" v-model="isDeliverymanAdvance">
                    <span>Es abono de domiciliario</span>
                </label>
                <div v-if="isDeliverymanAdvance" class="space-y-1">
                    <BaseSelect v-model="selectedDeliverymanId"
                        :options="deliverymenOptions"
                        size="sm"
                        :placeholder="loadingDeliverymen ? 'Cargando…' : 'Domiciliario…'"
                        value-key="value"
                        display-key="label"
                        :disabled="loadingDeliverymen"
                    />
                    <p class="text-xs text-gray-500">
                        Solo se muestran domiciliarios con pedidos de delivery en el día seleccionado.
                    </p>
                </div>
            </div>
        </form>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cancelar
            </BaseButton>
            <BaseButton @click="handleSubmit" variant="primary" :loading="loading || savingExpense" :disabled="!isFormValid">
                {{ editingExpense ? 'Actualizar' : 'Crear' }} Gasto
            </BaseButton>
        </template>
    </BaseDialog>

    <BaseDialog v-model="showSupplierModal" title="Nuevo proveedor" size="md">
        <form @submit.prevent="handleSupplierCreate" class="space-y-4">
            <BaseInput v-model="newSupplier.name" size="sm" label="Nombre" placeholder="Nombre del proveedor" required />
            <BaseInput v-model="newSupplier.phone" size="sm" label="Teléfono" placeholder="Teléfono" required />
            <BaseInput v-model="newSupplier.address" size="sm" label="Dirección (opcional)" />
            <BaseInput v-model="newSupplier.email" size="sm" label="Email (opcional)" type="email" />

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

    <!-- Crear categoría de gasto (reutilizado) -->
    <ExpenseCategoryFormModal :is-open="showExpenseCategoryForm" :editing-category="null"
        :initial-name="categorySearchInitialName"
        :loading="expenseCategoryFormLoading" @close="onCloseExpenseCategoryForm"
        @submit="handleExpenseCategorySubmit" />

    <!-- Crear gasto (reutilizado) -->
    <BaseDialog v-model="showExpenseForm" title="Nuevo Gasto" size="lg" z-class="z-[55]">
        <ExpenseForm :expense="null" :categories="allExpenseCategories" :loading="expenseFormLoading"
            :prefill-name="expensePrefillName"
            @submit="handleExpenseSubmit" @cancel="onExpenseFormCancel"
            @request-create-category="onRequestCreateCategoryFromExpenseForm" />
    </BaseDialog>

    <BaseDialog
        :model-value="showExpenseBankSyncModal"
        title="Ajustar pagos bancarios"
        size="md"
        @update:model-value="(v) => { if (!v) showExpenseBankSyncModal = false }"
    >
        <p class="text-sm text-gray-700">
            Este gasto estaba pagado solo con transferencias y el total ya no coincide con la suma en banco.
            ¿Repartir el nuevo total ({{ formatCurrency(invoiceGrossTotal) }}) entre las cuentas registradas de forma proporcional?
        </p>
        <template #footer>
            <BaseButton variant="secondary" @click="onDismissExpenseBankSync">No, guardar así</BaseButton>
            <BaseButton variant="primary" @click="onConfirmExpenseBankSync">Sí, ajustar y continuar</BaseButton>
        </template>
    </BaseDialog>

    <BaseDialog
        :model-value="showExpenseAdvanceConfirmModal"
        title="Actualizar abono de domiciliario"
        size="md"
        @update:model-value="(v) => { if (!v) showExpenseAdvanceConfirmModal = false }"
    >
        <p class="text-sm text-gray-700 space-y-2">
            <span class="block">
                Se actualizará el abono #{{ editingExpense?.linkedDeliverymanAdvanceId }} para igualar el total del gasto
                ({{ formatCurrency(invoiceGrossTotal) }}).
            </span>
            <span class="block text-amber-900 text-xs">
                Solo aplica automáticamente si el abono es del día actual; si no, debes corregirlo en el módulo de domiciliarios.
            </span>
        </p>
        <template #footer>
            <BaseButton variant="secondary" @click="showExpenseAdvanceConfirmModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="savingExpense" @click="onConfirmExpenseAdvanceSync">Confirmar y guardar</BaseButton>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { ExpenseHeader, CreateExpenseHeaderDto, UpdateExpenseHeaderDto, CreateExpenseDetailDto, CreateExpenseBankPaymentDto, SupplierExpenseSuggestion, ExpenseCategory, CreateExpenseCategoryDto, CreateExpenseDto, Expense } from '@/types/expense'
import type { Supplier, CreateSupplierDto } from '@/types/supplier'
import { expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'
import { bankApi } from '@/services/MainAPI/bankApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { expenseCategoryApi } from '@/services/MainAPI/expenseCategoryApi'
import { supplierApi } from '@/services/MainAPI/supplierApi'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import { useFormatting } from '@/composables/useFormatting'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/store/auth'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ExpenseCategoryFormModal from '@/components/expenses/ExpenseCategoryFormModal.vue'
import ExpenseForm from '@/components/expenses/ExpenseForm.vue'
import { PlusIcon, TrashIcon, SparklesIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { distributeExpenseBankPaymentsProportionally } from '@/utils/expenseBankDistribution'
import { todayYmd, defaultBusinessCalendar } from '@/utils/datetime'
import { DEFAULT_GENERAL_SUPPLIER_ID } from '@/utils/expenseFormDefaults'

interface Props {
    isOpen: boolean
    editingExpense?: ExpenseHeader | null
    loading?: boolean
    /** Id de línea (`expense_detail`) para scroll al abrir desde la grilla. */
    focusDetailId?: number | null
    /** Pre-asigna domiciliario (p. ej. liquidación). */
    presetDeliverymanId?: number | null
    /** No crear abono automático al guardar (el abono va en la liquidación). */
    skipAutoAdvance?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    editingExpense: null,
    loading: false,
    focusDetailId: null,
    presetDeliverymanId: null,
    skipAutoAdvance: false,
})

const emit = defineEmits<{
    'close': []
    'submit': [expense: ExpenseHeader]
}>()

const { formatCurrency } = useFormatting()
const { error, success } = useToast()
const authStore = useAuthStore()

const EXPENSE_VAT_RATE = 0.19

// Estado del formulario
const formData = ref<{
    supplierId: number | null
    /** Notas globales del comprobante */
    notes: string
    expenseDetails: Array<CreateExpenseDetailDto & {
        tempId: string
        /** Id de fila en BD al editar (para PUT sin borrar/recrear líneas). */
        detailId?: number
        expenseName: string
        expenseUnit?: string
        total?: number  // Total ingresado por el usuario (fuente de verdad)
        notes?: string
    }>
    expenseBankPayments: Array<CreateExpenseBankPaymentDto & { tempId: string; syncAmount?: boolean }>
}>({
    supplierId: null,
    notes: '',
    expenseDetails: [],
    expenseBankPayments: [],
})

// Opciones
const supplierOptions = ref<Array<{ value: number; label: string }>>([])
const bankOptions = ref<Array<{ value: number; label: string }>>([])
const expenseOptions = ref<Array<{ value: number; label: string; description?: string }>>([])

// Crear categoría / gasto "al vuelo"
const allExpenseCategories = ref<ExpenseCategory[]>([])
const showExpenseCategoryForm = ref(false)
const expenseCategoryFormLoading = ref(false)
const showExpenseForm = ref(false)
const expenseFormLoading = ref(false)
const targetDetailIndexForNewExpense = ref<number | null>(null)
/** Nombre sugerido al abrir "Nuevo gasto" desde el selector (sin coincidencia). */
const expensePrefillName = ref('')
/** Nombre sugerido al crear categoría desde el buscador en ExpenseForm. */
const categorySearchInitialName = ref('')
/** Notas por línea: textarea solo si el usuario abre con el ícono (o ya hay texto). */
const lineNotesOpen = ref<Record<string, boolean>>({})
const supplierExpenseSuggestions = ref<SupplierExpenseSuggestion[]>([])
const supplierExpensesLoading = ref(false)
const showAllSupplierExpenses = ref(false)
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

// Abono a domiciliario
const isDeliverymanAdvance = ref(false)
const selectedDeliverymanId = ref<number | null>(null)
const deliverymenOptions = ref<Array<{ value: number; label: string; ordersCount: number }>>([])
const loadingDeliverymen = ref(false)

/** IVA sobre subtotal de líneas; total factura = subtotal + IVA. */
const applyVat = ref(false)

/** Al abrir edición: el gasto cargaba 100 % por banco (suma bancos = total líneas) */
const editExpensePaymentSnapshot = ref<{ wasFullyBank: boolean } | null>(null)
const showExpenseBankSyncModal = ref(false)
const showExpenseAdvanceConfirmModal = ref(false)
const savingExpense = ref(false)

function toggleLineNotes(tempId: string) {
    lineNotesOpen.value = {
        ...lineNotesOpen.value,
        [tempId]: !lineNotesOpen.value[tempId],
    }
}

function syncLineNotesVisibilityFromDetails() {
    const next: Record<string, boolean> = { ...lineNotesOpen.value }
    for (const d of formData.value.expenseDetails) {
        if ((d.notes || '').trim()) next[d.tempId] = true
    }
    lineNotesOpen.value = next
}

function onSupplierCreateFromSearch(raw: string) {
    const name = raw.trim()
    if (name.length < 2) return
    newSupplier.value = {
        name,
        phone: '',
        address: '',
        email: '',
    }
    showSupplierModal.value = true
}

function onExpenseCreateFromSearch(index: number, raw: string) {
    const name = raw.trim()
    if (name.length < 2) return
    targetDetailIndexForNewExpense.value = index
    expensePrefillName.value = name
    showExpenseForm.value = true
}

function onCloseExpenseCategoryForm() {
    showExpenseCategoryForm.value = false
    categorySearchInitialName.value = ''
}

function onRequestCreateCategoryFromExpenseForm(name: string) {
    categorySearchInitialName.value = name
    showExpenseCategoryForm.value = true
}

function onExpenseFormCancel() {
    showExpenseForm.value = false
    expensePrefillName.value = ''
    targetDetailIndexForNewExpense.value = null
}

const formatLastUsedAt = (value?: string | null) => {
    if (!value) return ''
    try {
        return defaultBusinessCalendar.formatDayShortMonthYear(value)
    } catch {
        return ''
    }
}

const favoriteExpenseOptions = computed(() => {
    if (!supplierExpenseSuggestions.value.length) return []

    const optionMap = new Map(expenseOptions.value.map(option => [option.value, option]))

    return supplierExpenseSuggestions.value.map((suggestion) => {
        const baseOption = optionMap.get(suggestion.expenseId)
        const descriptionParts: string[] = []

        if (suggestion.lastUnitPrice !== undefined && suggestion.lastUnitPrice !== null) {
            descriptionParts.push(`Último ${formatCurrency(suggestion.lastUnitPrice)}`)
        }

        const formattedDate = formatLastUsedAt(suggestion.lastUsedAt)
        if (formattedDate) {
            descriptionParts.push(`Actualizado ${formattedDate}`)
        }

        const mergedDescription = descriptionParts.length > 0
            ? descriptionParts.join(' • ')
            : baseOption?.description

        return {
            value: suggestion.expenseId,
            label: baseOption?.label ?? `${suggestion.expenseName} - ${suggestion.expenseUnit}`,
            description: mergedDescription
        }
    })
})

const selectedExpenseIds = computed(() => {
    return new Set(
        formData.value.expenseDetails
            .map(detail => detail.expenseId)
            .filter((id): id is number => typeof id === 'number' && id > 0)
    )
})

const prioritizedExpenseOptions = computed(() => {
    if (!favoriteExpenseOptions.value.length) {
        return expenseOptions.value
    }

    const seen = new Set<number>()
    const result: Array<{ value: number; label: string; description?: string }> = []

    const pushOption = (option?: { value: number; label: string; description?: string }) => {
        if (!option || seen.has(option.value)) return
        seen.add(option.value)
        result.push(option)
    }

    favoriteExpenseOptions.value.forEach(pushOption)
    selectedExpenseIds.value.forEach(id => {
        const existing = expenseOptions.value.find(option => option.value === id)
        pushOption(existing)
    })

    if (showAllSupplierExpenses.value) {
        expenseOptions.value.forEach(pushOption)
    }

    return result.length > 0 ? result : expenseOptions.value
})

const supplierHasFavoriteExpenses = computed(() => favoriteExpenseOptions.value.length > 0)

const expenseSelectPlaceholder = computed(() => {
    if (supplierExpensesLoading.value) {
        return 'Cargando gastos frecuentes...'
    }

    if (supplierHasFavoriteExpenses.value && !showAllSupplierExpenses.value) {
        return 'Gastos frecuentes del proveedor'
    }

    return 'Buscar gasto...'
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
    await Promise.all([loadExpenses(), loadExpenseCategories()])

    await loadSuppliers()
})

watch(isDeliverymanAdvance, async (newVal) => {
    if (!newVal) {
        selectedDeliverymanId.value = null
        return
    }

    if (deliverymenOptions.value.length > 0) {
        return
    }

    loadingDeliverymen.value = true
    try {
        const today = todayYmd()
        const raw = await deliverymanApi.getWithOrdersToday({ date: today })
        const list = Array.isArray(raw) ? raw : [raw]
        deliverymenOptions.value = list.map(dm => ({
            value: dm.id,
            label: `${dm.name} (${dm.ordersCount} pedidos)`,
            ordersCount: dm.ordersCount,
        }))
    } catch (err: any) {
        console.error('Error loading deliverymen with orders:', err)
        error('Error cargando domiciliarios', err.message || 'No se pudieron cargar los domiciliarios')
        isDeliverymanAdvance.value = false
    } finally {
        loadingDeliverymen.value = false
    }
})

watch(() => formData.value.supplierId, async (supplierId) => {
    supplierExpenseSuggestions.value = []
    showAllSupplierExpenses.value = false

    if (!supplierId) {
        return
    }

    try {
        supplierExpensesLoading.value = true
        supplierExpenseSuggestions.value = await supplierApi.getSupplierExpenses(supplierId)
    } catch (err) {
        console.error('Error loading supplier expenses:', err)
        supplierExpenseSuggestions.value = []
    } finally {
        supplierExpensesLoading.value = false
    }
}, { immediate: true })

// Inicializar formulario cuando se abre el modal
const initializeForm = async () => {
    if (!props.isOpen) {
        return
    }

    if (props.editingExpense) {
        const details = await Promise.all(
            props.editingExpense.expenseDetails.map(async (detail) => {
                // Fuente de verdad: total persistido en API; solo si no viene, fallback a amount×qty (legado)
                const hasPersistedTotal = detail.total != null && !Number.isNaN(Number(detail.total))
                const total = hasPersistedTotal
                    ? roundMoney(Number(detail.total))
                    : roundMoney(Number(detail.amount) * Number(detail.quantity))
                const qty = Number(detail.quantity)
                const amount =
                    qty > 0 && total > 0 ? Math.round(total / qty) : Math.round(Number(detail.amount))
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
                    detailId: detail.id,
                    expenseId: detail.expenseId,
                    quantity: detail.quantity,
                    amount,
                    total,
                    tempId: `detail-${detail.id}`,
                    expenseName,
                    expenseUnit,
                    notes: detail.notes ?? '',
                }
            })
        )

        applyVat.value = Number(props.editingExpense.vatAmount ?? 0) > 0.01

        formData.value = {
            supplierId: props.editingExpense.supplierId,
            notes: props.editingExpense.notes ?? '',
            expenseDetails: details,
            expenseBankPayments: props.editingExpense.expenseBankPayments.map(payment => ({
                bankId: payment.bankId,
                amount: payment.amount,
                tempId: `payment-${payment.id}`,
                syncAmount: false,
            })),
        }
        const initialLineTotal = details.reduce((sum, d) => sum + Number(d.total ?? 0), 0)
        const initialVat = Number(props.editingExpense.vatAmount ?? 0)
        const initialGross = initialLineTotal + initialVat
        const initialBankSum = props.editingExpense.expenseBankPayments.reduce(
            (s, p) => s + Number(p.amount),
            0,
        )
        editExpensePaymentSnapshot.value = {
            wasFullyBank:
                props.editingExpense.expenseBankPayments.length > 0 &&
                Math.round(initialBankSum) === Math.round(initialGross),
        }
        await ensureSupplierOption(formData.value.supplierId)

        const dmId = props.editingExpense.deliverymanId
        if (dmId != null && dmId > 0) {
            isDeliverymanAdvance.value = true
            selectedDeliverymanId.value = dmId
            const name = props.editingExpense.deliverymanName ?? `Domiciliario #${dmId}`
            if (!deliverymenOptions.value.some((o) => o.value === dmId)) {
                deliverymenOptions.value = [
                    { value: dmId, label: name, ordersCount: 0 },
                    ...deliverymenOptions.value,
                ]
            }
        } else {
            isDeliverymanAdvance.value = false
            selectedDeliverymanId.value = null
        }
        syncLineNotesVisibilityFromDetails()
        await scrollToFocusedExpenseLine()
    } else {
        applyVat.value = false
        editExpensePaymentSnapshot.value = null
        formData.value = {
            supplierId: DEFAULT_GENERAL_SUPPLIER_ID,
            notes: '',
            expenseDetails: [],
            expenseBankPayments: [],
        }
        if (supplierOptions.value.length === 0) {
            await loadSuppliers()
        }
        await ensureSupplierOption(DEFAULT_GENERAL_SUPPLIER_ID)
        if (props.presetDeliverymanId) {
            selectedDeliverymanId.value = props.presetDeliverymanId
            isDeliverymanAdvance.value = true
        } else {
            selectedDeliverymanId.value = null
            isDeliverymanAdvance.value = false
        }
        syncLineNotesVisibilityFromDetails()
    }
}

async function scrollToFocusedExpenseLine() {
    const id = props.focusDetailId
    if (id == null || id <= 0) return
    await nextTick()
    requestAnimationFrame(() => {
        const el = document.querySelector(`[data-expense-line-id="${id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
}

watch([() => props.isOpen, () => props.editingExpense], async () => {
    await initializeForm()
}, { immediate: true })

const toggleExpenseOptionMode = () => {
    if (!supplierHasFavoriteExpenses.value) {
        return
    }
    showAllSupplierExpenses.value = !showAllSupplierExpenses.value
}

// Total de línea = solo lo que ingresa el usuario (amount es derivado, no se usa aquí)
const lineTotal = (detail: { total?: number }) => Number(detail.total ?? 0)

const totalExpenses = computed(() => {
    return formData.value.expenseDetails.reduce((sum, detail) => sum + lineTotal(detail), 0)
})

const invoiceVatAmount = computed(() => {
    if (!applyVat.value) return 0
    return Math.round(totalExpenses.value * EXPENSE_VAT_RATE)
})

const invoiceGrossTotal = computed(() => totalExpenses.value + invoiceVatAmount.value)

/** Edición: hay abono ExpenseOffset ligado y el total del formulario difiere del monto del abono */
const willSyncLinkedAdvanceOnSave = computed(() => {
    const e = props.editingExpense
    if (!e?.linkedDeliverymanAdvanceId) return false
    const prev = Number(e.linkedDeliverymanAdvanceAmount ?? 0)
    return Math.abs(invoiceGrossTotal.value - prev) > 0.01
})

const totalBankPayments = computed(() => {
    return formData.value.expenseBankPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
})

/** Edición: al cargar era 100 % banco y ahora suma bancos ≠ total del formulario */
const expenseBankAdjustNeeded = computed(() => {
    if (!props.editingExpense || !editExpensePaymentSnapshot.value?.wasFullyBank) return false
    if (formData.value.expenseBankPayments.length === 0) return false
    return Math.round(totalBankPayments.value) !== Math.round(invoiceGrossTotal.value)
})

const cashDifference = computed(() => {
    return invoiceGrossTotal.value - totalBankPayments.value
})

const isFormValid = computed(() => {
    return formData.value.supplierId !== null &&
        formData.value.expenseDetails.length > 0 &&
        formData.value.expenseDetails.every(d => d.expenseId > 0 && d.quantity > 0 && lineTotal(d) > 0) &&
        cashDifference.value >= 0
})

watch(invoiceGrossTotal, (gross) => {
    for (const p of formData.value.expenseBankPayments) {
        if (p.syncAmount) p.amount = gross
    }
})

async function applyGeneralSupplier() {
    formData.value.supplierId = DEFAULT_GENERAL_SUPPLIER_ID
    await ensureSupplierOption(DEFAULT_GENERAL_SUPPLIER_ID)
}

// Métodos
async function loadSuppliers() {
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

async function loadExpenses() {
    try {
        const response = await expenseApi.getAllExpenses()
        if (response.isSuccess && response.data) {
            expenseOptions.value = response.data.map(expense => ({
                value: expense.id,
                label: `${expense.name} - ${expense.unitDisplay}`,
                description: expense.categoryName
            }))
        }
    } catch (err) {
        console.error('Error loading expenses:', err)
    }
}

async function loadExpenseCategories() {
    try {
        const response = await expenseCategoryApi.getAllExpenseCategories()
        if (response.isSuccess && response.data) {
            allExpenseCategories.value = response.data
        }
    } catch (err) {
        console.error('Error loading expense categories:', err)
    }
}

const handleExpenseCategorySubmit = async (data: CreateExpenseCategoryDto) => {
    try {
        expenseCategoryFormLoading.value = true
        const created = await expenseCategoryApi.createExpenseCategory({ name: data.name })
        if (created.isSuccess && created.data) {
            // Mantener lista de categorías para el modal de creación de gastos
            allExpenseCategories.value = [created.data, ...allExpenseCategories.value]
            success('Categoría creada', 4000, created.data.name)
        }
        onCloseExpenseCategoryForm()
    } catch (err: any) {
        error('Error creando categoría', err?.message || 'No se pudo crear la categoría')
    } finally {
        expenseCategoryFormLoading.value = false
    }
}

const handleExpenseSubmit = async (data: CreateExpenseDto) => {
    try {
        expenseFormLoading.value = true
        const created = await expenseApi.createExpense(data)
        if (created.isSuccess && created.data) {
            const exp: Expense = created.data
            const option = {
                value: exp.id,
                label: `${exp.name} - ${exp.unitDisplay}`,
                description: exp.categoryName
            }
            expenseOptions.value = [option, ...expenseOptions.value]

            const idx = targetDetailIndexForNewExpense.value
            if (idx !== null && formData.value.expenseDetails[idx]) {
                formData.value.expenseDetails[idx].expenseId = exp.id
                await onExpenseSelected(idx, exp.id)
            }

            success('Gasto creado', 4000, exp.name)
        }
        showExpenseForm.value = false
        expensePrefillName.value = ''
        targetDetailIndexForNewExpense.value = null
    } catch (err: any) {
        error('Error creando gasto', err?.message || 'No se pudo crear el gasto')
    } finally {
        expenseFormLoading.value = false
    }
}

async function ensureSupplierOption(supplierId: number | null, existingSuppliers?: Supplier[]) {
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

/** Total de línea en pesos (2 decimales). */
function roundMoney(n: number): number {
    return Math.round(n * 100) / 100
}

function parseLineTotal(val: unknown): number {
    const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val)
    if (!Number.isFinite(n) || n < 0) return 0
    return roundMoney(n)
}

/** Referencia visual: total ÷ cantidad (no redondear a entero; el backend sigue usando amount entero solo como referencia). */
function calculateUnitPriceRef(detail: typeof formData.value.expenseDetails[0]): number {
    const t = Number(detail.total ?? 0)
    const q = Number(detail.quantity ?? 0)
    if (!t || !q) return 0
    return roundMoney(t / q)
}

/** Valor unitario entero para API (referencia; el total guardado es el que ingresa el usuario). */
function deriveIntegerUnitAmount(detail: typeof formData.value.expenseDetails[0]): number {
    const t = Number(detail.total ?? 0)
    const q = Number(detail.quantity ?? 0)
    if (!t || !q || q === 0) return 0
    return Math.round(t / q)
}

function formatUnitRef(unit: number): string {
    if (!unit) return formatCurrency(0)
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(unit)
}

function updateDerivedUnitAmount(index: number) {
    const detail = formData.value.expenseDetails[index]
    if (detail && detail.total != null && Number(detail.total) > 0 && Number(detail.quantity) > 0) {
        detail.amount = deriveIntegerUnitAmount(detail)
    }
}

const addDetail = () => {
    formData.value.expenseDetails.unshift({
        expenseId: 0,
        quantity: 1,
        amount: 0,
        total: 0,
        notes: '',
        tempId: `temp-${Date.now()}-${Math.random()}`,
        expenseName: '',
        expenseUnit: undefined,
    })
}

const removeDetail = (index: number) => {
    const row = formData.value.expenseDetails[index]
    if (row) {
        const { [row.tempId]: _removed, ...rest } = lineNotesOpen.value
        lineNotesOpen.value = rest
    }
    formData.value.expenseDetails.splice(index, 1)
}

const addBankPayment = () => {
    formData.value.expenseBankPayments.push({
        bankId: 0,
        amount: invoiceGrossTotal.value,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        syncAmount: true,
    })
}

function clearBankPaymentSync(index: number) {
    const p = formData.value.expenseBankPayments[index]
    if (p) p.syncAmount = false
}

function onBankPaymentBankSelected(index: number) {
    const p = formData.value.expenseBankPayments[index]
    if (p?.syncAmount) p.amount = invoiceGrossTotal.value
}

const removeBankPayment = (index: number) => {
    formData.value.expenseBankPayments.splice(index, 1)
}

function applyProportionalBankPaymentsToTotal() {
    const target = Math.round(invoiceGrossTotal.value)
    const payments = formData.value.expenseBankPayments
    if (payments.length === 0) return
    const distributed = distributeExpenseBankPaymentsProportionally(
        payments.map((p) => ({ bankId: p.bankId, amount: Number(p.amount || 0) })),
        target,
    )
    distributed.forEach((d, i) => {
        if (payments[i]) {
            payments[i].amount = d.amount
            payments[i].syncAmount = false
        }
    })
}

function continueAfterBankSyncPrompt() {
    showExpenseBankSyncModal.value = false
    if (props.editingExpense && willSyncLinkedAdvanceOnSave.value) {
        showExpenseAdvanceConfirmModal.value = true
        return
    }
    void executeExpenseSave()
}

function onConfirmExpenseBankSync() {
    applyProportionalBankPaymentsToTotal()
    continueAfterBankSyncPrompt()
}

function onDismissExpenseBankSync() {
    continueAfterBankSyncPrompt()
}

async function onConfirmExpenseAdvanceSync() {
    showExpenseAdvanceConfirmModal.value = false
    await executeExpenseSave()
}

const handleSubmit = async () => {
    if (!isFormValid.value) {
        error('Formulario inválido', 'Por favor completa todos los campos requeridos')
        return
    }

    if (props.editingExpense && expenseBankAdjustNeeded.value) {
        showExpenseBankSyncModal.value = true
        return
    }

    if (props.editingExpense && willSyncLinkedAdvanceOnSave.value) {
        showExpenseAdvanceConfirmModal.value = true
        return
    }

    await executeExpenseSave()
}

async function executeExpenseSave() {
    savingExpense.value = true
    try {
        const deliverymanForHeader =
            props.presetDeliverymanId ??
            (isDeliverymanAdvance.value ? selectedDeliverymanId.value : null)

        const headerNotes = (formData.value.notes || '').trim()
        const payload: CreateExpenseHeaderDto | UpdateExpenseHeaderDto = {
            supplierId: formData.value.supplierId!,
            ...(deliverymanForHeader ? { deliverymanId: deliverymanForHeader } : {}),
            includeVat: applyVat.value,
            ...(headerNotes ? { notes: headerNotes.slice(0, 2000) } : { notes: null }),
            expenseDetails: formData.value.expenseDetails.map(d => {
                const userTotal = roundMoney(Number(d.total ?? 0) || 0)
                const unitAmount = deriveIntegerUnitAmount(d)
                const lineNotes = (d.notes || '').trim()
                const line: CreateExpenseDetailDto & { id?: number } = {
                    expenseId: d.expenseId,
                    quantity: d.quantity,
                    amount: unitAmount,
                    total: userTotal,
                    ...(lineNotes ? { notes: lineNotes.slice(0, 1000) } : { notes: null }),
                }
                if (props.editingExpense && d.detailId != null && d.detailId > 0) {
                    line.id = d.detailId
                }
                return line
            }),
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

        if (!props.skipAutoAdvance && !props.editingExpense && isDeliverymanAdvance.value && selectedDeliverymanId.value) {
            const amount = invoiceGrossTotal.value
            try {
                const advance = await deliverymanApi.createAdvance(selectedDeliverymanId.value, {
                    amount,
                    notes: `gasto #${result.id} - ${result.supplierName}`,
                    paymentMethod: 'expense_offset',
                    expenseHeaderId: result.id,
                })
                result = {
                    ...result,
                    linkedDeliverymanAdvanceId: advance.id,
                    linkedDeliverymanAdvanceAmount: Number(advance.amount),
                    deliverymanId: selectedDeliverymanId.value,
                    deliverymanName: advance.deliverymanName ?? result.deliverymanName,
                }
            } catch (advanceError: any) {
                console.error('Error creating deliveryman advance from expense:', advanceError)
                error('Gasto guardado, pero falló el abono', advanceError.message || 'Revisa el módulo de domiciliarios')
            }
        }

        emit('submit', result)
    } catch (err: any) {
        const msg = err.message || ''
        if (
            props.editingExpense &&
            (msg.includes('mismo día') || msg.includes('domiciliarios'))
        ) {
            error(
                'No se pudo actualizar el abono automáticamente',
                'Si el abono no es del día actual, corrígelo en el módulo de domiciliarios. Detalle: ' + msg,
            )
        } else {
            error('Error al guardar', msg)
        }
    } finally {
        savingExpense.value = false
    }
}
</script>
