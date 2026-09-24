<template>
  <MainLayout page-title="Inventario">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Inventario</h1>
          <p class="text-sm text-gray-500">Existencia teórica, conteos físicos, recetas y transferencias.</p>
        </div>
        <button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="store.loading" @click="load">Actualizar</button>
      </div>

      <div v-if="store.error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ store.error }}</div>
      <div class="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Valor inventario" :value="money(store.totalValue)" />
        <SummaryCard label="Insumos con saldo" :value="String(store.balances.length)" />
        <SummaryCard label="Transferencias pendientes" :value="String(store.pendingTransfers)" />
      </div>

      <div class="flex gap-1 overflow-x-auto border-b border-gray-200">
        <button v-for="item in tabs" :key="item.id" class="whitespace-nowrap border-b-2 px-3 py-2 text-sm" :class="tab === item.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'" @click="tab = item.id">{{ item.label }}</button>
      </div>

      <section v-if="tab === 'balances'" class="overflow-x-auto">
        <table class="min-w-full text-sm"><thead><tr class="text-left text-gray-500"><th>Insumo</th><th>Unidad</th><th class="text-right">Existencia</th><th class="text-right">Reservado</th><th class="text-right">Disponible</th><th class="text-right">Costo prom.</th><th class="text-right">Valor</th></tr></thead>
          <tbody><tr v-for="row in store.balances" :key="row.expenseId" class="border-t"><td class="py-2 font-medium">{{ row.expenseName }}</td><td>{{ unit(row.baseUnit) }}</td><td class="text-right" :class="row.quantityOnHand < 0 ? 'text-red-600' : ''">{{ qty(row.quantityOnHand) }}</td><td class="text-right">{{ qty(row.quantityReserved) }}</td><td class="text-right">{{ qty(row.quantityAvailable) }}</td><td class="text-right">{{ money(row.averageUnitCost) }}</td><td class="text-right font-medium">{{ money(row.inventoryValue) }}</td></tr></tbody>
        </table>
      </section>

      <section v-else-if="tab === 'movements'" class="overflow-x-auto">
        <table class="min-w-full text-sm"><thead><tr class="text-left text-gray-500"><th>Fecha</th><th>Insumo</th><th>Tipo</th><th class="text-right">Existencia</th><th class="text-right">Reserva</th><th>Origen</th></tr></thead>
          <tbody><tr v-for="row in store.movements" :key="row.id" class="border-t"><td class="py-2">{{ date(row.createdAt) }}</td><td>{{ row.expenseName }}</td><td>{{ movement(row.type) }}</td><td class="text-right">{{ signed(row.onHandDelta) }}</td><td class="text-right">{{ signed(row.reservedDelta) }}</td><td>{{ row.orderId ? `Pedido #${row.orderId}` : row.reason || '—' }}</td></tr></tbody>
        </table>
      </section>

      <section v-else-if="tab === 'counts'" class="space-y-4">
        <button class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white" @click="startCount">Iniciar conteo</button>
        <div v-for="count in store.counts" :key="count.id" class="rounded-xl border p-4">
          <div class="mb-3 flex justify-between"><strong>Conteo #{{ count.id }}</strong><span class="text-sm text-gray-500">{{ count.status }} · {{ date(count.createdAt) }}</span></div>
          <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <label v-for="line in count.lines" :key="line.expenseId" class="text-sm"><span class="mb-1 block text-gray-600">{{ line.expenseName }} · esperado {{ qty(line.expectedQuantity) }} {{ unit(line.baseUnit) }}</span><input v-if="count.status === 'draft'" v-model.number="countValues[count.id][line.expenseId]" type="number" min="0" step="0.001" class="w-full rounded-lg border px-3 py-2"><span v-else class="font-medium">Contado: {{ qty(line.countedQuantity || 0) }} · Diferencia: {{ signed(line.difference || 0) }}</span></label>
          </div>
          <button v-if="count.status === 'draft'" class="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white" @click="confirmCount(count)">Confirmar conteo completo</button>
        </div>
      </section>

      <section v-else-if="tab === 'adjustments'" class="max-w-xl space-y-3 rounded-xl border p-4">
        <h2 class="font-semibold">Ajuste o merma</h2>
        <select v-model.number="adjustment.expenseId" class="w-full rounded-lg border px-3 py-2"><option :value="0">Selecciona insumo</option><option v-for="item in inventoryExpenses" :key="item.id" :value="item.id">{{ item.name }}</option></select>
        <input v-model.number="adjustment.quantityDelta" type="number" step="0.001" placeholder="Cantidad (+ ingreso, - salida)" class="w-full rounded-lg border px-3 py-2">
        <input v-model="adjustment.reason" placeholder="Motivo obligatorio" class="w-full rounded-lg border px-3 py-2">
        <label class="flex gap-2 text-sm"><input v-model="adjustment.waste" type="checkbox"> Registrar como merma</label>
        <button class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white" @click="saveAdjustment">Registrar</button>
      </section>

      <section v-else-if="tab === 'transfers'" class="space-y-4">
        <div class="space-y-3 rounded-xl border p-4">
          <select v-model.number="transfer.destinationBranchId" class="rounded-lg border px-3 py-2"><option :value="0">Sucursal destino</option><option v-for="branch in destinationBranches" :key="branch.id" :value="branch.id">{{ branch.name }}</option></select>
          <div v-for="(line, index) in transfer.lines" :key="index" class="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><select v-model.number="line.expenseId" class="rounded-lg border px-3 py-2"><option :value="0">Insumo</option><option v-for="item in inventoryExpenses" :key="item.id" :value="item.id">{{ item.name }}</option></select><input v-model.number="line.quantity" type="number" min="0" step="0.001" placeholder="Cantidad" class="rounded-lg border px-3 py-2"><button class="px-3 text-red-600" @click="transfer.lines.splice(index, 1)">Quitar</button></div>
          <div class="flex gap-2"><button class="rounded border px-3 py-2 text-sm" @click="transfer.lines.push({ expenseId: 0, quantity: 1 })">Agregar insumo</button><button class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white" @click="createTransfer">Crear borrador</button></div>
        </div>
        <div v-for="item in store.transfers" :key="item.id" class="rounded-xl border p-4 text-sm">
          <div class="flex flex-wrap justify-between gap-2"><strong>#{{ item.id }} · {{ item.sourceBranchName }} → {{ item.destinationBranchName }}</strong><span>{{ item.status }}</span></div>
          <p class="mt-2 text-gray-600">{{ item.lines.map(x => `${x.expenseName}: ${qty(x.receivedQuantity ?? x.quantity)} ${unit(x.baseUnit)}`).join(' · ') }}</p>
          <div v-if="item.status === 'dispatched' && item.destinationBranchId === currentBranchId" class="mt-3 grid gap-2 md:grid-cols-2">
            <label v-for="line in item.lines" :key="line.expenseId" class="text-xs text-gray-600">{{ line.expenseName }} recibido<input v-model.number="receiveValues[item.id][line.expenseId]" type="number" min="0" :max="line.quantity" step="0.001" class="mt-1 w-full rounded border px-2 py-1.5"></label>
            <input v-model="receiveReasons[item.id]" placeholder="Motivo si existe diferencia" class="rounded border px-2 py-1.5 text-sm">
          </div>
          <div class="mt-3 flex flex-wrap gap-2"><button v-if="item.status === 'draft' && item.sourceBranchId === currentBranchId" class="rounded bg-blue-600 px-3 py-1.5 text-white" @click="dispatch(item.id)">Despachar</button><button v-if="item.status === 'dispatched' && item.destinationBranchId === currentBranchId" class="rounded bg-emerald-600 px-3 py-1.5 text-white" @click="receive(item)">Confirmar recibido</button></div>
        </div>
      </section>

      <section v-else-if="tab === 'catalog'" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3"><select v-model.number="catalogExpenseId" class="rounded-lg border px-3 py-2"><option :value="0">Selecciona insumo/gasto</option><option v-for="item in expenses" :key="item.id" :value="item.id">{{ item.name }}</option></select><select v-model="catalog.baseUnit" class="rounded-lg border px-3 py-2"><option value="unit">Unidad</option><option value="gram">Gramo</option><option value="milliliter">Mililitro</option></select><label class="flex items-center gap-2"><input v-model="catalog.active" type="checkbox"> Inventario activo</label></div>
        <div v-if="catalogExpenseId" class="space-y-2"><div v-for="(conversion, index) in catalog.conversions" :key="index" class="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input v-model="conversion.name" placeholder="Presentación (caja, bulto...)" class="rounded-lg border px-3 py-2"><input v-model.number="conversion.baseQuantity" type="number" min="0" step="0.001" placeholder="Equivalencia base" class="rounded-lg border px-3 py-2"><button class="px-3 text-red-600" @click="catalog.conversions.splice(index, 1)">Quitar</button></div><div class="flex gap-2"><button class="rounded border px-3 py-2 text-sm" @click="catalog.conversions.push({ name: '', baseQuantity: 1, active: true })">Agregar presentación</button><button class="rounded bg-emerald-600 px-3 py-2 text-sm text-white" @click="saveCatalog">Guardar insumo</button></div></div>
      </section>

      <section v-else-if="tab === 'recipes'" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3"><select v-model.number="recipeProductId" class="rounded-lg border px-3 py-2"><option :value="0">Selecciona producto</option><option v-for="item in products" :key="item.id" :value="item.id">{{ item.name }}</option></select><select v-model="recipe.mode" class="rounded-lg border px-3 py-2"><option value="estimated">Estimada</option><option value="strict">Estricta</option></select><label class="flex items-center gap-2"><input v-model="recipe.enabled" type="checkbox"> Inventario activado</label></div>
        <div v-for="(requirement, index) in recipe.requirements" :key="index" class="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><select v-model.number="requirement.expenseId" class="rounded-lg border px-3 py-2"><option :value="0">Insumo</option><option v-for="item in inventoryExpenses" :key="item.id" :value="item.id">{{ item.name }}</option></select><input v-model.number="requirement.baseQuantity" type="number" min="0" step="0.001" placeholder="Cantidad base por producto" class="rounded-lg border px-3 py-2"><button class="px-3 text-red-600" @click="recipe.requirements.splice(index, 1)">Quitar</button></div>
        <div v-if="recipeProductId" class="flex gap-2"><button class="rounded border px-3 py-2 text-sm" @click="recipe.requirements.push({ expenseId: 0, baseQuantity: 1 })">Agregar insumo</button><button class="rounded bg-emerald-600 px-3 py-2 text-sm text-white" @click="saveRecipe">Guardar receta</button></div>
      </section>

      <section v-else class="space-y-4">
        <div class="flex flex-wrap gap-2"><input v-model="fromDate" type="date" class="rounded-lg border px-3 py-2"><input v-model="toDate" type="date" class="rounded-lg border px-3 py-2"><button class="rounded bg-emerald-600 px-3 py-2 text-sm text-white" @click="load">Consultar</button></div>
        <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead><tr class="text-left text-gray-500"><th>Insumo</th><th class="text-right">Compras</th><th class="text-right">Consumo estimado</th><th class="text-right">Consumo estricto</th><th class="text-right">Mermas</th><th class="text-right">Última diferencia</th><th class="text-right">%</th></tr></thead><tbody><tr v-for="row in store.report" :key="row.expenseId" class="border-t"><td class="py-2">{{ row.expenseName }}</td><td class="text-right">{{ qty(row.purchases) }}</td><td class="text-right">{{ qty(row.estimatedConsumption) }}</td><td class="text-right">{{ qty(row.strictConsumption) }}</td><td class="text-right">{{ qty(row.waste) }}</td><td class="text-right">{{ row.latestDifference == null ? '—' : signed(row.latestDifference) }}</td><td class="text-right">{{ row.latestDifferencePercentage == null ? '—' : `${qty(row.latestDifferencePercentage)}%` }}</td></tr></tbody></table></div>
        <h2 class="font-semibold">Evolución de desviaciones</h2><div class="overflow-x-auto"><table class="min-w-full text-sm"><tbody><tr v-for="row in store.deviation" :key="`${row.countId}-${row.expenseId}`" class="border-t"><td class="py-2">{{ date(row.countedAt) }}</td><td>{{ row.expenseName }}</td><td class="text-right">Esperado {{ qty(row.expectedQuantity) }}</td><td class="text-right">Real {{ qty(row.countedQuantity) }}</td><td class="text-right">{{ signed(row.difference) }}</td></tr></tbody></table></div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useInventoryStore } from '@/store/inventory'
import { useBranchContextStore } from '@/store/branchContext'
import { useAuthStore } from '@/store/auth'
import { inventoryApi } from '@/services/MainAPI/inventoryApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { productApi } from '@/services/MainAPI/productApi'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useToast } from '@/composables/useToast'
import { useSignalR } from '@/composables/useSignalR'
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr'
import type { Expense } from '@/types/expense'
import type { Product } from '@/types/product'
import type { InventoryCount, InventoryTransfer } from '@/types/inventory'
import type { BranchOption } from '@/store/branchContext'

const SummaryCard = defineComponent({ props: { label: String, value: String }, setup: props => () => h('div', { class: 'rounded-xl border bg-white p-4' }, [h('p', { class: 'text-sm text-gray-500' }, props.label), h('p', { class: 'mt-1 text-2xl font-semibold' }, props.value)]) })
const store = useInventoryStore()
const branches = useBranchContextStore()
const auth = useAuthStore()
const toast = useToast()
const { on: onSignalR, off: offSignalR } = useSignalR(ORDERS_SIGNALR_HUB_URL)
const tabs = computed(() => [{ id: 'balances', label: 'Existencias' }, { id: 'movements', label: 'Movimientos' }, { id: 'counts', label: 'Conteos' }, { id: 'adjustments', label: 'Ajustes y mermas' }, { id: 'transfers', label: 'Transferencias' }, { id: 'catalog', label: 'Insumos' }, ...(auth.isSuperadmin ? [{ id: 'recipes', label: 'Recetas' }] : []), { id: 'reports', label: 'Teórico vs real' }])
const tab = ref('balances')
const expenses = ref<Expense[]>([])
const products = ref<Product[]>([])
const transferBranches = ref<BranchOption[]>([])
const countValues = reactive<Record<number, Record<number, number>>>({})
const receiveValues = reactive<Record<number, Record<number, number>>>({})
const receiveReasons = reactive<Record<number, string>>({})
const fromDate = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const toDate = ref(new Date().toISOString().slice(0, 10))
const currentBranchId = computed(() => branches.selectedBranchId || 0)
const destinationBranches = computed(() => transferBranches.value.filter(x => x.id !== currentBranchId.value))
const inventoryExpenses = computed(() => expenses.value.filter(x => x.tracksInventory && x.inventoryActive))
const adjustment = reactive({ expenseId: 0, quantityDelta: 0, reason: '', waste: false })
const transfer = reactive<{ destinationBranchId: number; lines: Array<{ expenseId: number; quantity: number }> }>({ destinationBranchId: 0, lines: [{ expenseId: 0, quantity: 1 }] })
const catalogExpenseId = ref(0)
const catalog = reactive<{ active: boolean; baseUnit: 'unit' | 'gram' | 'milliliter'; conversions: Array<{ name: string; baseQuantity: number; active: boolean }> }>({ active: false, baseUnit: 'unit', conversions: [] })
const recipeProductId = ref(0)
const recipe = reactive<{ enabled: boolean; mode: 'estimated' | 'strict'; requirements: Array<{ expenseId: number; baseQuantity: number }> }>({ enabled: false, mode: 'estimated', requirements: [] })

const range = () => ({ from: new Date(`${fromDate.value}T00:00:00`).toISOString(), to: new Date(`${toDate.value}T00:00:00`).getTime() + 86400000 })
async function load() { const r = range(); await store.refresh(r.from, new Date(r.to).toISOString()); initializeCounts(); initializeTransfers() }
function initializeCounts() { for (const count of store.counts) countValues[count.id] ??= Object.fromEntries(count.lines.map(x => [x.expenseId, x.countedQuantity ?? Math.max(x.expectedQuantity, 0)])) }
function initializeTransfers() { for (const item of store.transfers) receiveValues[item.id] ??= Object.fromEntries(item.lines.map(x => [x.expenseId, x.receivedQuantity ?? x.quantity])) }
async function action(work: () => Promise<unknown>, message: string) { try { await work(); toast.success(message, 3500); await load() } catch (e: any) { toast.error('No fue posible completar la operación', e?.message) } }
async function startCount() { await action(() => inventoryApi.startCount(), 'Conteo iniciado') }
async function confirmCount(count: InventoryCount) { await action(() => inventoryApi.confirmCount(count.id, count.lines.map(x => ({ expenseId: x.expenseId, countedQuantity: Number(countValues[count.id][x.expenseId]) }))), 'Conteo confirmado') }
async function saveAdjustment() { await action(() => inventoryApi.adjust({ ...adjustment }), 'Ajuste registrado'); Object.assign(adjustment, { quantityDelta: 0, reason: '', waste: false }) }
async function createTransfer() { await action(() => inventoryApi.createTransfer({ sourceBranchId: currentBranchId.value, destinationBranchId: transfer.destinationBranchId, lines: transfer.lines }), 'Transferencia creada') }
async function dispatch(id: number) { await action(() => inventoryApi.dispatchTransfer(id), 'Transferencia despachada') }
async function receive(item: InventoryTransfer) { await action(() => inventoryApi.receiveTransfer(item.id, { lines: item.lines.map(x => ({ expenseId: x.expenseId, receivedQuantity: Number(receiveValues[item.id][x.expenseId]) })), differenceReason: receiveReasons[item.id] || undefined }), 'Transferencia recibida') }
async function saveCatalog() { const item = expenses.value.find(x => x.id === catalogExpenseId.value); if (!item) return; await action(() => expenseApi.updateExpense(item.id, { name: item.name, categoryId: item.categoryId, unit: item.unit, menuTargets: (item.menuTargets || []).map(x => ({ targetType: x.targetType as any, targetId: x.targetId })), tracksInventory: true, inventoryActive: catalog.active, inventoryBaseUnit: catalog.baseUnit, inventoryConversions: catalog.conversions }), 'Insumo actualizado'); await loadCatalogs() }
async function saveRecipe() { await action(() => inventoryApi.setRecipe(recipeProductId.value, { controlMode: recipe.mode, enabled: recipe.enabled, requirements: recipe.requirements }), 'Receta guardada') }
async function loadCatalogs() { const [expenseResponse, productResponse, branchResponse] = await Promise.all([expenseApi.getAllExpenses(), productApi.getProducts({ page: 1, pageSize: 500 }), branchApi.getBranchOptions()]); expenses.value = expenseResponse.data || []; products.value = productResponse.data?.items || []; transferBranches.value = branchResponse.data || [] }

watch(catalogExpenseId, id => { const item = expenses.value.find(x => x.id === id); catalog.active = item?.inventoryActive || false; catalog.baseUnit = item?.inventoryBaseUnit || 'unit'; catalog.conversions = (item?.inventoryConversions || []).map(x => ({ name: x.name, baseQuantity: x.baseQuantity, active: x.active })) })
watch(recipeProductId, async id => { if (!id) return; try { const value = await inventoryApi.getRecipe(id); recipe.enabled = value.inventoryEnabled; recipe.mode = value.controlMode; recipe.requirements = value.requirements.map(x => ({ expenseId: x.expenseId, baseQuantity: x.baseQuantity })) } catch (e: any) { toast.error('No se pudo cargar la receta', e?.message) } })
watch(() => branches.revision, () => void load())
const handleInventoryChanged = (payload: { branchId?: number }) => { if (!payload?.branchId || payload.branchId === currentBranchId.value) void load() }
const handleTransferPending = (payload: { branchId?: number }) => { if (!payload?.branchId || payload.branchId === currentBranchId.value) void load() }
onMounted(async () => { onSignalR('InventoryChanged', handleInventoryChanged); onSignalR('InventoryTransferPending', handleTransferPending); await Promise.all([load(), loadCatalogs()]) })
onBeforeUnmount(() => { offSignalR('InventoryChanged', handleInventoryChanged); offSignalR('InventoryTransferPending', handleTransferPending) })

const qty = (value: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(value)
const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(value)
const date = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const signed = (value: number) => `${value > 0 ? '+' : ''}${qty(value)}`
const unit = (value: string) => ({ unit: 'un', gram: 'g', milliliter: 'ml' }[value] || value)
const movement = (value: string) => ({ opening_balance: 'Apertura', purchase: 'Compra', reservation: 'Reserva', reservation_release: 'Liberación', estimated_consumption: 'Consumo estimado', strict_consumption: 'Consumo estricto', adjustment_increase: 'Ajuste +', adjustment_decrease: 'Ajuste -', waste: 'Merma', transfer_out: 'Transferencia salida', transfer_in: 'Transferencia entrada', reversal: 'Reversión' }[value] || value)
</script>
