<template>
    <MainLayout>
        <div class="p-6 space-y-6 max-w-7xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Imputación gastos → menú</h1>
                    <p class="text-sm text-gray-600 mt-1">
                        Costo estimado por gramo según compras del periodo y gramos vendidos (productos con peso).
                    </p>
                </div>
                <BaseButton variant="primary" size="sm" :loading="loading" @click="loadReport">
                    Actualizar
                </BaseButton>
            </div>

            <div class="flex flex-wrap gap-4 items-end bg-white border border-gray-200 rounded-lg p-4">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                    <input v-model="fromDate" type="date"
                        class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                    <input v-model="toDate" type="date"
                        class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
                <div v-if="authStore.isSuperadmin" class="min-w-[200px]">
                    <label class="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
                    <select v-model.number="branchFilter"
                        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option :value="0">Todas</option>
                        <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                    </select>
                </div>
            </div>

            <div v-if="errorMsg" class="rounded-md bg-red-50 text-red-800 text-sm px-4 py-2">
                {{ errorMsg }}
            </div>

            <div v-if="loading" class="space-y-2">
                <div v-for="i in 6" :key="i" class="h-10 bg-gray-100 animate-pulse rounded" />
            </div>

            <div v-else-if="data && !data.lines.length" class="text-sm text-gray-500">
                No hay destinos de menú configurados en gastos de catálogo, o no hay datos en el rango.
            </div>

            <div v-else-if="data" class="overflow-x-auto border border-gray-200 rounded-lg bg-white">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <tr>
                            <th class="px-3 py-2">Gasto</th>
                            <th class="px-3 py-2">Destino</th>
                            <th class="px-3 py-2 text-right">Gasto periodo</th>
                            <th class="px-3 py-2 text-right">Gramos vendidos</th>
                            <th class="px-3 py-2 text-right">COP imputados</th>
                            <th class="px-3 py-2 text-right">COP / g</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-for="(row, idx) in data.lines" :key="idx" class="hover:bg-gray-50/80">
                            <td class="px-3 py-2 font-medium text-gray-900">{{ row.expenseName }}</td>
                            <td class="px-3 py-2 text-gray-700">
                                <span class="text-xs text-gray-500 mr-1">{{ targetLabel(row.targetType) }}</span>
                                {{ row.targetName }}
                            </td>
                            <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.totalExpenseInPeriodCop) }}</td>
                            <td class="px-3 py-2 text-right tabular-nums">{{ formatNumber(row.totalWeightGramsSold) }}</td>
                            <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(row.allocatedCop) }}</td>
                            <td class="px-3 py-2 text-right tabular-nums text-gray-700">
                                {{ row.costPerGramCop != null ? formatCurrency(Math.round(row.costPerGramCop)) : '—' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useAuthStore } from '@/store/auth'
import { formatCurrency, formatNumber } from '@/composables/useFormatting'
import type { ExpenseMenuAttributionLine, ExpenseMenuAttributionResponse } from '@/types/expense'
import type { Branch } from '@/types/common'

const authStore = useAuthStore()

const loading = ref(false)
const errorMsg = ref('')
const data = ref<ExpenseMenuAttributionResponse | null>(null)
const branches = ref<Branch[]>([])

const fromDate = ref('')
const toDate = ref('')
const branchFilter = ref(0)

function padRange() {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    toDate.value = iso(end)
    fromDate.value = iso(start)
}

function toUtcBounds(): { fromUtc: string; toUtc: string } {
    const from = new Date(fromDate.value + 'T00:00:00.000Z')
    const to = new Date(toDate.value + 'T23:59:59.999Z')
    return { fromUtc: from.toISOString(), toUtc: to.toISOString() }
}

function targetLabel(t: ExpenseMenuAttributionLine['targetType']): string {
    if (t === 1 || t === 'product' || t === 'Product') return 'Producto'
    return 'Categoría'
}

async function loadBranches() {
    if (!authStore.isSuperadmin) return
    try {
        const res = await branchApi.getBranches({ Page: 1, PageSize: 200, SortBy: 'name', SortOrder: 'asc' })
        if (res.isSuccess && res.data) branches.value = res.data.items || []
    } catch {
        branches.value = []
    }
}

async function loadReport() {
    errorMsg.value = ''
    loading.value = true
    try {
        const { fromUtc, toUtc } = toUtcBounds()
        const bid = authStore.isSuperadmin
            ? (branchFilter.value > 0 ? branchFilter.value : null)
            : (authStore.branchId ?? null)
        const res = await expenseApi.getMenuAttribution({
            fromUtc,
            toUtc,
            branchId: bid,
        })
        if (!res.isSuccess) {
            errorMsg.value = res.message || 'No se pudo cargar el reporte'
            data.value = null
            return
        }
        data.value = res.data
    } catch (e: any) {
        errorMsg.value = e?.message || 'Error al cargar'
        data.value = null
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    padRange()
    await loadBranches()
    await loadReport()
})
</script>
