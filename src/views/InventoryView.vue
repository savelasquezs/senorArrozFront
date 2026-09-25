<template>
  <MainLayout page-title="Inventario" hide-quick-order>
    <div class="space-y-5">
      <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight text-gray-900">Inventario</h1>
            <BaseBadge variant="info" size="sm">{{ activeBranchName }}</BaseBadge>
            <BaseBadge v-if="isGlobalSection" variant="warning" size="sm">Aplica a todas las sucursales</BaseBadge>
          </div>
          <p class="mt-1 max-w-3xl text-sm text-gray-500">
            Controla existencias, conteos, movimientos y configuración desde un solo lugar.
          </p>
        </div>
        <BaseButton variant="outline" size="sm" :icon="ArrowPathIcon" :loading="activeSectionLoading" @click="refreshActiveSection">
          Actualizar
        </BaseButton>
      </header>

      <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumen de inventario">
        <article v-for="card in summaryCards" :key="card.label" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ card.label }}</p>
              <p class="mt-1 text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">{{ card.value }}</p>
              <p v-if="card.hint" class="mt-1 text-xs text-gray-500">{{ card.hint }}</p>
            </div>
            <component :is="card.icon" class="h-5 w-5 shrink-0 text-emerald-600" />
          </div>
        </article>
      </section>

      <nav class="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-2" aria-label="Secciones de inventario">
        <div class="flex min-w-max gap-4">
          <div v-for="group in navigationGroups" :key="group.label" class="flex items-center gap-1">
            <span class="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ group.label }}</span>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="tab === item.id ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'"
              :aria-current="tab === item.id ? 'page' : undefined"
              @click="selectSection(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
      </nav>

      <div v-if="activeSectionError" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>{{ activeSectionError }}</span>
        <BaseButton variant="outline" size="sm" @click="refreshActiveSection">Reintentar</BaseButton>
      </div>

      <section v-if="tab === 'balances'" class="space-y-4">
        <SectionHeading title="Existencias" description="Consulta el saldo actual de la sucursal y actúa directamente sobre cada insumo." />
        <div class="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
          <BaseSelect v-model="balanceFilters.categoryId" :options="expenseCategoryOptions" label="Categoría" />
          <BaseInput v-model="balanceFilters.search" label="Buscar insumo" placeholder="Ej. Coca Cola" />
          <BaseSelect v-model="balanceFilters.unit" :options="unitFilterOptions" label="Unidad base" />
          <BaseSelect v-model="balanceFilters.status" :options="balanceStatusOptions" label="Estado" />
        </div>
        <LoadingPanel v-if="store.loadingBySection.balances" />
        <EmptyPanel v-else-if="filteredBalances.length === 0" title="No hay existencias para mostrar" description="Activa insumos, confirma un conteo inicial o cambia los filtros." />
        <div v-else>
          <div class="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-3">Insumo</th><th class="px-4 py-3">Unidad</th><th class="px-4 py-3 text-right">Existencia</th><th class="px-4 py-3 text-right">Reservado</th><th class="px-4 py-3 text-right">Disponible</th><th class="px-4 py-3 text-right">Costo prom.</th><th class="px-4 py-3 text-right">Valor</th><th class="px-4 py-3 text-right">Acciones</th></tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white">
                <tr v-for="row in filteredBalances" :key="row.expenseId" class="hover:bg-gray-50">
                  <td class="px-4 py-3"><p class="font-semibold text-gray-900">{{ row.expenseName }}</p><p class="text-xs text-gray-500">{{ expenseById(row.expenseId)?.categoryName || 'Sin categoría' }}</p></td>
                  <td class="px-4 py-3"><BaseBadge variant="secondary" size="sm">{{ unit(row.baseUnit) }}</BaseBadge></td>
                  <td class="px-4 py-3 text-right font-medium tabular-nums" :class="row.quantityOnHand < 0 ? 'text-red-600' : 'text-gray-900'">{{ qty(row.quantityOnHand) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-amber-700">{{ qty(row.quantityReserved) }}</td>
                  <td class="px-4 py-3 text-right font-semibold tabular-nums" :class="row.quantityAvailable <= 0 ? 'text-red-600' : 'text-emerald-700'">{{ qty(row.quantityAvailable) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-600">{{ money(row.averageUnitCost) }}</td>
                  <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ money(row.inventoryValue) }}</td>
                  <td class="px-4 py-3"><div class="flex justify-end gap-2"><button class="text-xs font-semibold text-emerald-700 hover:underline" @click="openAdjustment(row.expenseId)">Ajustar</button><button class="text-xs font-semibold text-blue-700 hover:underline" @click="openMovements(row.expenseId)">Movimientos</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="grid gap-3 md:hidden">
            <article v-for="row in filteredBalances" :key="row.expenseId" class="rounded-xl border border-gray-200 bg-white p-4">
              <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-gray-900">{{ row.expenseName }}</h3><p class="text-xs text-gray-500">{{ expenseById(row.expenseId)?.categoryName || 'Sin categoría' }}</p></div><BaseBadge variant="secondary" size="sm">{{ unit(row.baseUnit) }}</BaseBadge></div>
              <dl class="mt-4 grid grid-cols-3 gap-2 text-center"><div><dt class="text-[10px] uppercase text-gray-400">Existencia</dt><dd class="font-semibold">{{ qty(row.quantityOnHand) }}</dd></div><div><dt class="text-[10px] uppercase text-gray-400">Reservado</dt><dd class="font-semibold text-amber-700">{{ qty(row.quantityReserved) }}</dd></div><div><dt class="text-[10px] uppercase text-gray-400">Disponible</dt><dd class="font-semibold text-emerald-700">{{ qty(row.quantityAvailable) }}</dd></div></dl>
              <div class="mt-4 flex gap-2"><BaseButton size="sm" variant="outline" @click="openAdjustment(row.expenseId)">Ajustar</BaseButton><BaseButton size="sm" variant="secondary" @click="openMovements(row.expenseId)">Movimientos</BaseButton></div>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'movements'" class="space-y-4">
        <SectionHeading title="Movimientos" description="Rastrea entradas, salidas, reservas y su documento de origen." />
        <div class="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3 xl:grid-cols-6">
          <BaseInput v-model="movementFilters.from" type="date" label="Desde" />
          <BaseInput v-model="movementFilters.to" type="date" label="Hasta" />
          <BaseInput v-model="movementFilters.search" label="Buscar insumo" placeholder="Nombre" />
          <BaseSelect v-model="movementFilters.type" :options="movementTypeOptions" label="Tipo" />
          <BaseSelect v-model="movementFilters.origin" :options="movementOriginOptions" label="Origen" />
          <div class="flex items-end"><BaseButton full-width variant="secondary" size="sm" @click="clearMovementFilters">Limpiar</BaseButton></div>
        </div>
        <LoadingPanel v-if="store.loadingBySection.movements" />
        <EmptyPanel v-else-if="filteredMovements.length === 0" title="No encontramos movimientos" description="Prueba otro rango o elimina algunos filtros." />
        <div v-else class="overflow-x-auto rounded-xl border border-gray-200">
          <table class="min-w-[60rem] w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th class="px-4 py-3">Fecha</th><th class="px-4 py-3">Insumo</th><th class="px-4 py-3">Tipo</th><th class="px-4 py-3 text-right">Existencia</th><th class="px-4 py-3 text-right">Reserva</th><th class="px-4 py-3">Origen</th></tr></thead>
            <tbody class="divide-y divide-gray-100 bg-white"><tr v-for="row in filteredMovements" :key="row.id" class="hover:bg-gray-50"><td class="px-4 py-3 whitespace-nowrap text-gray-600">{{ date(row.createdAt) }}</td><td class="px-4 py-3 font-semibold text-gray-900">{{ row.expenseName }}</td><td class="px-4 py-3"><BaseBadge :variant="movementBadge(row.type)" size="sm">{{ movement(row.type) }}</BaseBadge></td><td class="px-4 py-3 text-right font-semibold tabular-nums" :class="deltaClass(row.onHandDelta)">{{ signed(row.onHandDelta) }}</td><td class="px-4 py-3 text-right font-semibold tabular-nums" :class="deltaClass(row.reservedDelta)">{{ signed(row.reservedDelta) }}</td><td class="px-4 py-3 text-gray-600">{{ movementSource(row) }}</td></tr></tbody>
          </table>
        </div>
      </section>

      <section v-else-if="tab === 'counts'" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading title="Conteos físicos" description="Compara lo que debería existir con lo que realmente encuentras." />
          <BaseButton v-if="!activeCount" :loading="saving" @click="startCount">Iniciar conteo</BaseButton>
        </div>
        <LoadingPanel v-if="store.loadingBySection.counts" />
        <template v-else>
          <article v-if="activeCount" class="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
            <header class="border-b border-emerald-100 bg-emerald-50 p-4 sm:p-5">
              <div class="flex flex-wrap items-start justify-between gap-3"><div><div class="flex items-center gap-2"><h3 class="font-bold text-gray-900">Conteo #{{ activeCount.id }}</h3><BaseBadge variant="warning" size="sm">En progreso</BaseBadge></div><p class="mt-1 text-sm text-gray-600">Iniciado {{ date(activeCount.createdAt) }} · se guarda en este navegador hasta confirmar.</p></div><div class="text-right"><p class="text-2xl font-bold text-emerald-700">{{ countProgress.completed }}/{{ countProgress.total }}</p><p class="text-xs text-gray-500">insumos contados</p></div></div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100"><div class="h-full rounded-full bg-emerald-600 transition-all" :style="{ width: `${countProgress.percent}%` }" /></div>
            </header>
            <div class="p-4 sm:p-5">
              <BaseInput v-model="countSearch" label="Buscar dentro del conteo" placeholder="Categoría o insumo" />
              <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label v-for="line in filteredCountLines" :key="line.expenseId" class="rounded-lg border border-gray-200 p-3">
                  <span class="flex items-start justify-between gap-2"><span><strong class="block text-sm text-gray-900">{{ line.expenseName }}</strong><span class="text-xs text-gray-500">{{ expenseById(line.expenseId)?.categoryName || 'Sin categoría' }}</span></span><BaseBadge variant="secondary" size="sm">{{ unit(line.baseUnit) }}</BaseBadge></span>
                  <span class="mt-3 grid grid-cols-2 gap-2"><span><span class="block text-[10px] uppercase text-gray-400">Teórico</span><span class="font-semibold tabular-nums">{{ qty(line.expectedQuantity) }}</span></span><span><span class="block text-[10px] uppercase text-gray-400">Diferencia</span><span class="font-semibold tabular-nums" :class="deltaClass(countDifference(activeCount.id, line.expenseId, line.expectedQuantity))">{{ countValue(activeCount.id, line.expenseId) == null ? 'Pendiente' : signed(countDifference(activeCount.id, line.expenseId, line.expectedQuantity)) }}</span></span></span>
                  <input :value="countValue(activeCount.id, line.expenseId) ?? ''" type="number" min="0" step="0.001" class="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Cantidad física" @input="setCountValue(activeCount, line.expenseId, $event)">
                </label>
              </div>
              <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p class="text-sm text-gray-500">{{ countProgress.total - countProgress.completed }} pendientes por contar.</p><BaseButton :disabled="!countIsComplete" :loading="saving" @click="countPreviewOpen = true">Revisar y confirmar</BaseButton></div>
            </div>
          </article>
          <EmptyPanel v-else title="No hay un conteo abierto" description="Inicia un conteo para registrar las cantidades físicas de todos los insumos activos." />

          <div v-if="confirmedCounts.length" class="space-y-3">
            <h3 class="text-sm font-bold uppercase tracking-wide text-gray-500">Historial reciente</h3>
            <details v-for="count in confirmedCounts" :key="count.id" class="rounded-xl border border-gray-200 bg-white p-4">
              <summary class="cursor-pointer list-none"><div class="flex items-center justify-between gap-3"><div><strong class="text-gray-900">Conteo #{{ count.id }}</strong><p class="text-xs text-gray-500">{{ date(count.confirmedAt || count.createdAt) }}</p></div><div class="flex items-center gap-2"><BaseBadge variant="success" size="sm">Confirmado</BaseBadge><span class="text-sm font-semibold" :class="deltaClass(countTotalDifference(count))">{{ signed(countTotalDifference(count)) }}</span></div></div></summary>
              <div class="mt-4 grid gap-2 border-t pt-4 md:grid-cols-2 xl:grid-cols-3"><div v-for="line in count.lines" :key="line.expenseId" class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"><span>{{ line.expenseName }}</span><strong :class="deltaClass(line.difference || 0)">{{ signed(line.difference || 0) }}</strong></div></div>
            </details>
          </div>
        </template>
      </section>

      <section v-else-if="tab === 'adjustments'" class="space-y-4">
        <SectionHeading title="Ajustes y mermas" description="Registra correcciones manuales con una vista previa del saldo resultante." />
        <div class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <form class="space-y-4 rounded-xl border border-gray-200 bg-white p-5" @submit.prevent="saveAdjustment">
            <fieldset><legend class="mb-2 text-sm font-semibold text-gray-700">Tipo de movimiento</legend><div class="grid grid-cols-3 gap-2"><button v-for="typeOption in adjustmentTypes" :key="typeOption.id" type="button" class="rounded-lg border px-3 py-2 text-sm font-semibold" :class="adjustment.type === typeOption.id ? typeOption.activeClass : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'" @click="adjustment.type = typeOption.id">{{ typeOption.label }}</button></div></fieldset>
            <BaseSelect v-model="adjustment.expenseId" :options="inventoryExpenseOptions" label="Insumo" />
            <BaseInput v-model="adjustment.quantity" type="number" :min="0.001" step="0.001" label="Cantidad" :hint="selectedAdjustmentBalance ? `Unidad: ${unit(selectedAdjustmentBalance.baseUnit)}` : 'Selecciona un insumo para conocer su unidad'" />
            <BaseInput v-model="adjustment.reason" label="Motivo" placeholder="Explica por qué se realiza este movimiento" :maxlength="180" />
            <BaseButton type="submit" :disabled="!adjustmentIsValid" :loading="saving">Revisar ajuste</BaseButton>
          </form>
          <aside class="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 class="font-semibold text-gray-900">Vista previa</h3>
            <template v-if="selectedAdjustmentBalance"><dl class="mt-4 space-y-3 text-sm"><div class="flex justify-between"><dt class="text-gray-500">Existencia actual</dt><dd class="font-semibold">{{ qty(selectedAdjustmentBalance.quantityOnHand) }} {{ unit(selectedAdjustmentBalance.baseUnit) }}</dd></div><div class="flex justify-between"><dt class="text-gray-500">Movimiento</dt><dd class="font-semibold" :class="deltaClass(adjustmentDelta)">{{ signed(adjustmentDelta) }} {{ unit(selectedAdjustmentBalance.baseUnit) }}</dd></div><div class="flex justify-between border-t pt-3"><dt class="font-medium text-gray-700">Resultado estimado</dt><dd class="text-lg font-bold" :class="adjustmentResult < 0 ? 'text-red-600' : 'text-emerald-700'">{{ qty(adjustmentResult) }} {{ unit(selectedAdjustmentBalance.baseUnit) }}</dd></div></dl><p v-if="adjustmentResult < selectedAdjustmentBalance.quantityReserved" class="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">El resultado queda por debajo de las unidades reservadas y puede ser rechazado si el insumo es estricto.</p></template>
            <p v-else class="mt-3 text-sm text-gray-500">Selecciona un insumo para ver el impacto antes de registrar.</p>
          </aside>
        </div>
      </section>

      <section v-else-if="tab === 'transfers'" class="space-y-4">
        <SectionHeading title="Transferencias" description="Prepara, despacha y recibe inventario entre sucursales con trazabilidad." />
        <div class="rounded-xl border border-gray-200 bg-white p-5">
          <div class="grid gap-3 md:grid-cols-2"><div><p class="text-xs font-bold uppercase text-gray-400">Origen</p><p class="mt-1 font-semibold text-gray-900">{{ activeBranchName }}</p></div><BaseSelect v-model="transfer.destinationBranchId" :options="destinationBranchOptions" label="Sucursal destino" /></div>
          <div class="mt-5 space-y-3"><div v-for="(line, index) in transfer.lines" :key="index" class="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]"><BaseSelect v-model="line.expenseId" :options="inventoryExpenseOptions" label="Insumo" /><BaseInput v-model="line.quantity" type="number" :min="0.001" step="0.001" label="Cantidad" :hint="transferLineHint(line.expenseId)" /><div class="flex items-end"><BaseButton variant="ghost" size="sm" :disabled="transfer.lines.length === 1" @click="transfer.lines.splice(index, 1)">Quitar</BaseButton></div></div></div>
          <div class="mt-4 flex flex-wrap justify-between gap-3"><BaseButton variant="secondary" size="sm" @click="transfer.lines.push({ expenseId: 0, quantity: null })">Agregar insumo</BaseButton><BaseButton :disabled="!transferIsValid" :loading="saving" @click="createTransfer">Revisar transferencia</BaseButton></div>
        </div>
        <LoadingPanel v-if="store.loadingBySection.transfers" />
        <EmptyPanel v-else-if="store.transfers.length === 0" title="No hay transferencias" description="Las transferencias creadas desde o hacia esta sucursal aparecerán aquí." />
        <div v-else class="space-y-3">
          <article v-for="item in store.transfers" :key="item.id" class="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3"><div><div class="flex items-center gap-2"><h3 class="font-bold text-gray-900">Transferencia #{{ item.id }}</h3><BaseBadge :variant="transferBadge(item.status)" size="sm">{{ transferStatus(item.status) }}</BaseBadge></div><p class="mt-1 text-sm text-gray-500">{{ item.sourceBranchName }} → {{ item.destinationBranchName }} · {{ date(item.createdAt) }}</p></div><div class="flex gap-2"><BaseButton v-if="item.status === 'draft' && item.sourceBranchId === currentBranchId" size="sm" @click="dispatch(item)">Despachar</BaseButton></div></div>
            <div class="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3"><div v-for="line in item.lines" :key="line.expenseId" class="rounded-lg bg-gray-50 px-3 py-2 text-sm"><div class="flex justify-between gap-3"><span class="font-medium text-gray-800">{{ line.expenseName }}</span><strong>{{ qty(line.quantity) }} {{ unit(line.baseUnit) }}</strong></div><p v-if="line.receivedQuantity != null" class="mt-1 text-xs text-gray-500">Recibido: {{ qty(line.receivedQuantity) }} {{ unit(line.baseUnit) }}</p></div></div>
            <div v-if="item.status === 'dispatched' && item.destinationBranchId === currentBranchId" class="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4"><h4 class="font-semibold text-blue-900">Confirmar recepción</h4><div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><BaseInput v-for="line in item.lines" :key="line.expenseId" v-model="receiveValues[item.id][line.expenseId]" type="number" :min="0" :max="line.quantity" step="0.001" :label="line.expenseName" :hint="`Despachado: ${qty(line.quantity)} ${unit(line.baseUnit)}`" /></div><BaseInput v-if="transferHasDifference(item)" v-model="receiveReasons[item.id]" class="mt-3" label="Motivo de la diferencia" placeholder="Explica la diferencia encontrada" /><div class="mt-3 flex justify-end"><BaseButton size="sm" :disabled="transferHasDifference(item) && !receiveReasons[item.id]?.trim()" :loading="saving" @click="receive(item)">Confirmar recibido</BaseButton></div></div>
            <p v-if="item.differenceReason" class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><strong>Diferencia:</strong> {{ item.differenceReason }}</p>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'catalog'" class="space-y-4">
        <SectionHeading title="Configuración de insumos" description="Filtra el catálogo, configura cada variante y replica una plantilla sobre varias filas." />
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Configuración global:</strong> los cambios de unidad y presentaciones aplican a todas las sucursales del restaurante.</div>
        <div class="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
          <BaseSelect v-model="catalogFilters.categoryId" :options="expenseCategoryOptions" label="1. Categoría" />
          <BaseInput v-model="catalogFilters.search" label="2. Nombre común" placeholder="Ej. Coca Cola" hint="Ignora tildes, espacios y guiones." />
          <BaseSelect v-model="catalogFilters.status" :options="catalogStatusOptions" label="Estado de inventario" />
        </div>
        <div v-if="selectedCatalogIds.length" class="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm"><div><strong class="text-sm text-emerald-900">{{ selectedCatalogIds.length }} seleccionados</strong><p class="text-xs text-emerald-700">Marca una fila como plantilla para copiar su configuración completa.</p></div><div class="flex gap-2"><BaseButton variant="secondary" size="sm" @click="clearCatalogSelection">Limpiar</BaseButton><BaseButton size="sm" :disabled="!catalogTemplateId || selectedCatalogIds.length < 2" @click="bulkPreviewOpen = true">Vista previa y aplicar</BaseButton></div></div>
        <EmptyPanel v-if="filteredCatalog.length === 0" title="No encontramos insumos" description="Selecciona otra categoría o cambia el nombre buscado." />
        <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-4 py-3"><label class="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" :checked="allVisibleCatalogSelected" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" @change="toggleAllVisibleCatalog">Seleccionar resultados</label><span class="text-xs text-gray-500">{{ filteredCatalog.length }} variantes</span></div>
          <div class="divide-y divide-gray-100">
            <article v-for="item in filteredCatalog" :key="item.id" class="p-4 hover:bg-gray-50">
              <div class="grid items-center gap-3 md:grid-cols-[auto_auto_minmax(0,1fr)_8rem_minmax(10rem,1fr)_auto]">
                <input v-model="selectedCatalogIds" type="checkbox" :value="item.id" :aria-label="`Seleccionar ${item.name}`" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">
                <label class="flex items-center gap-1 text-xs text-gray-500" title="Usar como plantilla"><input v-model.number="catalogTemplateId" type="radio" name="catalog-template" :value="item.id" :disabled="!selectedCatalogIds.includes(item.id)" class="border-gray-300 text-blue-600 focus:ring-blue-500">Plantilla</label>
                <div><h3 class="font-semibold text-gray-900">{{ item.name }}</h3><p class="text-xs text-gray-500">{{ item.categoryName }}</p></div>
                <BaseBadge :variant="item.inventoryActive ? 'success' : 'secondary'" size="sm">{{ item.inventoryActive ? 'Activo' : 'Inactivo' }}</BaseBadge>
                <div class="text-sm text-gray-600"><strong>{{ unit(item.inventoryBaseUnit) }}</strong><span class="mx-1">·</span><span>{{ item.inventoryConversions.filter(x => x.active).map(x => `${x.name}: ${qty(x.baseQuantity)}`).join(', ') || 'Sin presentaciones' }}</span></div>
                <BaseButton variant="outline" size="sm" @click="openCatalogEditor(item)">{{ catalogEditorExpenseId === item.id ? 'Cerrar' : 'Configurar' }}</BaseButton>
              </div>
              <form v-if="catalogEditorExpenseId === item.id" class="mt-4 space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4" @submit.prevent="saveCatalog">
                <div class="grid gap-3 md:grid-cols-2"><BaseSelect v-model="catalogEditor.baseUnit" :options="baseUnitOptions" label="Unidad base" /><label class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"><input v-model="catalogEditor.active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">Inventario activo</label></div>
                <div><div class="mb-2 flex items-center justify-between"><div><h4 class="text-sm font-semibold text-gray-800">Presentaciones de compra</h4><p class="text-xs text-gray-500">Ej. Caja · 12 unidades.</p></div><BaseButton variant="secondary" size="sm" @click="catalogEditor.conversions.push({ name: '', baseQuantity: 1, active: true })">Agregar presentación</BaseButton></div><div class="space-y-2"><div v-for="(conversion, index) in catalogEditor.conversions" :key="index" class="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]"><BaseInput v-model="conversion.name" placeholder="Nombre de presentación" /><BaseInput v-model="conversion.baseQuantity" type="number" :min="0.001" step="0.001" placeholder="Equivalencia" /><label class="flex items-center gap-2 px-2 text-xs text-gray-600"><input v-model="conversion.active" type="checkbox" class="rounded border-gray-300 text-emerald-600">Activa</label><BaseButton variant="ghost" size="sm" @click="catalogEditor.conversions.splice(index, 1)">Quitar</BaseButton></div></div></div>
                <div class="flex justify-end gap-2"><BaseButton variant="secondary" size="sm" @click="closeCatalogEditor">Cancelar</BaseButton><BaseButton type="submit" size="sm" :disabled="!catalogEditorIsValid" :loading="saving">Guardar configuración</BaseButton></div>
              </form>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'recipes'" class="space-y-4">
        <SectionHeading title="Recetas de inventario" description="Configura el consumo por producto de la sucursal activa." />
        <div class="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3"><BaseSelect v-model="recipeFilters.categoryId" :options="productCategoryOptions" label="Categoría" /><BaseInput v-model="recipeFilters.search" label="Buscar producto" placeholder="Nombre del producto" /><BaseSelect v-model="recipeFilters.status" :options="recipeStatusOptions" label="Estado" /></div>
        <EmptyPanel v-if="filteredProducts.length === 0" title="No encontramos productos" description="Cambia los filtros o revisa la sucursal activa." />
        <div v-else class="grid gap-4 xl:grid-cols-[minmax(22rem,1fr)_minmax(28rem,1.4fr)]">
          <div class="max-h-[42rem] overflow-y-auto rounded-xl border border-gray-200 bg-white"><button v-for="product in filteredProducts" :key="product.id" type="button" class="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50" :class="recipeProductId === product.id ? 'bg-emerald-50 ring-inset ring-2 ring-emerald-200' : ''" @click="selectRecipeProduct(product.id)"><div><strong class="text-sm text-gray-900">{{ product.name }}</strong><p class="text-xs text-gray-500">{{ product.categoryName }}</p></div><div class="flex gap-2"><BaseBadge :variant="product.inventoryEnabled ? 'success' : 'secondary'" size="sm">{{ product.inventoryEnabled ? 'Activo' : 'Sin activar' }}</BaseBadge><BaseBadge :variant="product.inventoryControlMode === 'strict' ? 'warning' : 'info'" size="sm">{{ product.inventoryControlMode === 'strict' ? 'Estricto' : 'Estimado' }}</BaseBadge></div></button></div>
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <LoadingPanel v-if="recipeLoading" compact />
            <EmptyPanel v-else-if="!recipeProductId" title="Selecciona un producto" description="La configuración y sus insumos aparecerán aquí." compact />
            <form v-else class="space-y-4" @submit.prevent="saveRecipe"><div><h3 class="text-lg font-bold text-gray-900">{{ selectedRecipeProduct?.name }}</h3><p class="text-sm text-gray-500">{{ selectedRecipeProduct?.categoryName }}</p></div><div class="grid gap-3 md:grid-cols-2"><BaseSelect v-model="recipe.mode" :options="recipeModeOptions" label="Tipo de control" /><label class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium"><input v-model="recipe.enabled" type="checkbox" class="rounded border-gray-300 text-emerald-600">Inventario activado</label></div><div class="rounded-lg bg-blue-50 p-3 text-xs text-blue-900"><strong>{{ recipe.mode === 'strict' ? 'Control estricto:' : 'Control estimado:' }}</strong> {{ recipe.mode === 'strict' ? 'reserva existencias y puede bloquear la venta cuando se agota; úsalo para bebidas.' : 'descuenta teóricamente sin bloquear la venta; úsalo para productos preparados.' }}</div><div class="space-y-2"><div class="flex items-center justify-between"><h4 class="text-sm font-semibold text-gray-800">Insumos por unidad vendida</h4><BaseButton variant="secondary" size="sm" @click="recipe.requirements.push({ expenseId: 0, baseQuantity: null })">Agregar insumo</BaseButton></div><div v-for="(requirement, index) in recipe.requirements" :key="index" class="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[minmax(0,1fr)_10rem_auto]"><BaseSelect v-model="requirement.expenseId" :options="inventoryExpenseOptions" label="Insumo" /><BaseInput v-model="requirement.baseQuantity" type="number" :min="0.001" step="0.001" label="Cantidad base" :hint="requirement.expenseId ? unit(expenseById(requirement.expenseId)?.inventoryBaseUnit || 'unit') : ''" /><div class="flex items-end"><BaseButton variant="ghost" size="sm" @click="recipe.requirements.splice(index, 1)">Quitar</BaseButton></div></div></div><div v-if="recipeBlockers.length" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Antes de activar:</strong><ul class="mt-1 list-disc pl-5"><li v-for="blocker in recipeBlockers" :key="blocker">{{ blocker }}</li></ul></div><div class="flex justify-end"><BaseButton type="submit" :disabled="!recipeIsValid" :loading="saving">Guardar receta</BaseButton></div></form>
          </div>
        </div>
      </section>

      <section v-else class="space-y-4">
        <SectionHeading title="Teórico vs. real" description="Analiza consumo, mermas y diferencias de conteo por período." />
        <div class="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"><div><p class="mb-1 text-xs font-semibold text-gray-600">Rango rápido</p><div class="flex gap-2"><button v-for="preset in reportPresets" :key="preset.days" type="button" class="rounded-lg border px-3 py-2 text-sm font-medium" :class="reportPresetDays === preset.days ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600'" @click="applyReportPreset(preset.days)">{{ preset.label }}</button></div></div><BaseInput v-model="fromDate" type="date" label="Desde" /><BaseInput v-model="toDate" type="date" label="Hasta" /><BaseSelect v-model="reportFilters.categoryId" :options="expenseCategoryOptions" label="Categoría" /><BaseInput v-model="reportFilters.search" label="Buscar insumo" placeholder="Nombre" /><BaseButton :loading="store.loadingBySection.reports" @click="loadReports">Consultar</BaseButton></div>
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4"><article v-for="metric in reportMetrics" :key="metric.label" class="rounded-xl border border-gray-200 bg-white p-4"><p class="text-xs uppercase tracking-wide text-gray-500">{{ metric.label }}</p><p class="mt-1 text-xl font-bold tabular-nums" :class="metric.class">{{ metric.value }}</p></article></div>
        <LoadingPanel v-if="store.loadingBySection.reports" />
        <EmptyPanel v-else-if="filteredReport.length === 0" title="No hay datos para este período" description="Amplía el rango, cambia los filtros o confirma un conteo físico." />
        <template v-else>
          <div class="overflow-x-auto rounded-xl border border-gray-200"><table class="min-w-[80rem] w-full divide-y divide-gray-200 text-sm"><thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th class="px-4 py-3">Insumo</th><th class="px-4 py-3 text-right">Compras</th><th class="px-4 py-3 text-right">Estimado</th><th class="px-4 py-3 text-right">Estricto</th><th class="px-4 py-3 text-right">Ajustes</th><th class="px-4 py-3 text-right">Mermas</th><th class="px-4 py-3 text-right">Transf. entrada</th><th class="px-4 py-3 text-right">Transf. salida</th><th class="px-4 py-3 text-right">Teórico</th><th class="px-4 py-3 text-right">Real</th><th class="px-4 py-3 text-right">Diferencia</th><th class="px-4 py-3 text-right">%</th></tr></thead><tbody class="divide-y divide-gray-100 bg-white"><tr v-for="row in filteredReport" :key="row.expenseId" class="hover:bg-gray-50"><td class="px-4 py-3"><strong class="text-gray-900">{{ row.expenseName }}</strong><p class="text-xs text-gray-500">{{ expenseById(row.expenseId)?.categoryName || 'Sin categoría' }}</p></td><td class="px-4 py-3 text-right tabular-nums">{{ qty(row.purchases) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ qty(row.estimatedConsumption) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ qty(row.strictConsumption) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ signed(row.adjustments) }}</td><td class="px-4 py-3 text-right tabular-nums text-amber-700">{{ qty(row.waste) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ qty(row.transferIn) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ qty(row.transferOut) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ row.latestExpected == null ? '—' : qty(row.latestExpected) }}</td><td class="px-4 py-3 text-right tabular-nums">{{ row.latestCounted == null ? '—' : qty(row.latestCounted) }}</td><td class="px-4 py-3 text-right font-semibold tabular-nums" :class="deltaClass(row.latestDifference || 0)">{{ row.latestDifference == null ? '—' : signed(row.latestDifference) }}</td><td class="px-4 py-3 text-right font-semibold tabular-nums">{{ row.latestDifferencePercentage == null ? '—' : `${qty(row.latestDifferencePercentage)}%` }}</td></tr></tbody></table></div>
          <div class="rounded-xl border border-gray-200 bg-white p-5"><div class="flex flex-wrap items-end justify-between gap-3"><div><h3 class="font-bold text-gray-900">Evolución de desviaciones</h3><p class="text-sm text-gray-500">Selecciona un insumo para comparar sus conteos.</p></div><BaseSelect v-model="reportExpenseId" :options="reportExpenseOptions" label="Insumo" /></div><EmptyPanel v-if="selectedDeviation.length === 0" title="Sin conteos en el rango" description="Este insumo no tiene desviaciones confirmadas en el período." compact /><div v-else class="mt-5 space-y-3"><div v-for="point in selectedDeviation" :key="`${point.countId}-${point.expenseId}`" class="grid items-center gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_7rem]"><span class="text-xs text-gray-500">{{ shortDate(point.countedAt) }}</span><div class="h-6 overflow-hidden rounded bg-gray-100"><div class="flex h-full min-w-1 items-center rounded px-2 text-[10px] font-bold text-white" :class="point.difference < 0 ? 'justify-end bg-red-500' : 'bg-emerald-500'" :style="{ width: `${deviationBarWidth(point.difference)}%` }">{{ signed(point.difference) }}</div></div><span class="text-right text-xs text-gray-500">Real {{ qty(point.countedQuantity) }}</span></div></div></div>
        </template>
      </section>
    </div>

    <BaseDialog v-model="bulkPreviewOpen" title="Aplicar configuración a seleccionados" size="2xl">
      <div v-if="catalogTemplate" class="space-y-4"><div class="rounded-lg bg-emerald-50 p-4"><p class="text-sm text-emerald-900"><strong>Plantilla:</strong> {{ catalogTemplate.name }}</p><p class="mt-1 text-xs text-emerald-700">{{ catalogTemplate.inventoryActive ? 'Inventario activo' : 'Inventario inactivo' }} · {{ unit(catalogTemplate.inventoryBaseUnit) }} · {{ catalogTemplate.inventoryConversions.map(item => `${item.name}: ${qty(item.baseQuantity)}`).join(', ') || 'Sin presentaciones' }}</p></div><div class="max-h-72 overflow-y-auto rounded-lg border"><table class="w-full text-sm"><thead class="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Destino</th><th class="px-3 py-2">Configuración actual</th><th class="px-3 py-2">Nueva configuración</th></tr></thead><tbody class="divide-y"><tr v-for="item in catalogBulkTargets" :key="item.id"><td class="px-3 py-3 font-medium">{{ item.name }}</td><td class="px-3 py-3 text-gray-500">{{ item.inventoryActive ? 'Activo' : 'Inactivo' }} · {{ unit(item.inventoryBaseUnit) }}</td><td class="px-3 py-3 text-emerald-700">{{ catalogTemplate.inventoryActive ? 'Activo' : 'Inactivo' }} · {{ unit(catalogTemplate.inventoryBaseUnit) }}</td></tr></tbody></table></div><p class="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">El API actual guarda cada insumo por separado. Si uno falla, la interfaz informará cuántos requieren revisión; no se mostrará la operación como atómica.</p></div>
      <template #footer><BaseButton variant="secondary" :disabled="saving" @click="bulkPreviewOpen = false">Cancelar</BaseButton><BaseButton :loading="saving" :disabled="!catalogTemplate || catalogBulkTargets.length === 0 || !catalogTemplateHasConversions" @click="applyCatalogTemplate">Aplicar a {{ catalogBulkTargets.length }} insumos</BaseButton></template>
    </BaseDialog>

    <BaseDialog v-model="countPreviewOpen" title="Revisar conteo físico" size="2xl">
      <div v-if="activeCount" class="space-y-4">
        <div class="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-4 text-center"><div><p class="text-xs uppercase text-gray-500">Insumos</p><strong class="text-lg">{{ activeCount.lines.length }}</strong></div><div><p class="text-xs uppercase text-gray-500">Con diferencia</p><strong class="text-lg text-amber-700">{{ countPreviewDifferences }}</strong></div><div><p class="text-xs uppercase text-gray-500">Diferencia neta</p><strong class="text-lg" :class="deltaClass(countPreviewTotal)">{{ signed(countPreviewTotal) }}</strong></div></div>
        <div class="max-h-96 overflow-y-auto rounded-lg border"><table class="w-full text-sm"><thead class="sticky top-0 bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-3 py-2">Insumo</th><th class="px-3 py-2 text-right">Teórico</th><th class="px-3 py-2 text-right">Físico</th><th class="px-3 py-2 text-right">Diferencia</th></tr></thead><tbody class="divide-y"><tr v-for="line in activeCount.lines" :key="line.expenseId"><td class="px-3 py-3 font-medium">{{ line.expenseName }}</td><td class="px-3 py-3 text-right tabular-nums">{{ qty(line.expectedQuantity) }}</td><td class="px-3 py-3 text-right tabular-nums">{{ qty(Number(countValue(activeCount.id, line.expenseId))) }}</td><td class="px-3 py-3 text-right font-semibold tabular-nums" :class="deltaClass(countDifference(activeCount.id, line.expenseId, line.expectedQuantity))">{{ signed(countDifference(activeCount.id, line.expenseId, line.expectedQuantity)) }}</td></tr></tbody></table></div>
      </div>
      <template #footer><BaseButton variant="secondary" :disabled="saving" @click="countPreviewOpen = false">Volver al conteo</BaseButton><BaseButton :loading="saving" :disabled="!activeCount || !countIsComplete" @click="activeCount && confirmCount(activeCount)">Confirmar conteo</BaseButton></template>
    </BaseDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowPathIcon, ArrowsRightLeftIcon, BanknotesIcon, ClipboardDocumentCheckIcon, CubeIcon } from '@heroicons/vue/24/outline'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useInventoryStore, type InventoryDataSection } from '@/store/inventory'
import { useBranchContextStore } from '@/store/branchContext'
import { useAuthStore } from '@/store/auth'
import { inventoryApi } from '@/services/MainAPI/inventoryApi'
import { expenseApi } from '@/services/MainAPI/expenseApi'
import { productApi } from '@/services/MainAPI/productApi'
import { useToast } from '@/composables/useToast'
import { useDialog } from '@/composables/useDialog'
import { useSignalR } from '@/composables/useSignalR'
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr'
import { countDraftStorageKey, expenseInventoryPayload, inventoryDateRange, matchesInventorySearch, restoreCountDraft, type InventorySection } from '@/utils/inventoryUi'
import type { Expense } from '@/types/expense'
import type { Product } from '@/types/product'
import type { InventoryBalance, InventoryCount, InventoryMovement, InventoryTransfer } from '@/types/inventory'

const SectionHeading = defineComponent({ props: { title: String, description: String }, setup: props => () => h('div', [h('h2', { class: 'text-lg font-bold text-gray-900' }, props.title), h('p', { class: 'mt-0.5 text-sm text-gray-500' }, props.description)]) })
const LoadingPanel = defineComponent({ props: { compact: Boolean }, setup: props => () => h('div', { class: ['flex items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-500', props.compact ? 'py-10' : 'py-20'] }, [h('span', { class: 'mr-3 h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent' }), 'Cargando información…']) })
const EmptyPanel = defineComponent({ props: { title: String, description: String, compact: Boolean }, setup: props => () => h('div', { class: ['rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 text-center', props.compact ? 'py-8' : 'py-14'] }, [h(CubeIcon, { class: 'mx-auto h-8 w-8 text-gray-300' }), h('h3', { class: 'mt-3 font-semibold text-gray-800' }, props.title), h('p', { class: 'mx-auto mt-1 max-w-lg text-sm text-gray-500' }, props.description)]) })

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()
const branches = useBranchContextStore()
const auth = useAuthStore()
const toast = useToast()
const { confirmDialog } = useDialog()
const { on: onSignalR, off: offSignalR } = useSignalR(ORDERS_SIGNALR_HUB_URL)

const validSections: InventorySection[] = ['balances', 'movements', 'counts', 'adjustments', 'transfers', 'catalog', 'recipes', 'reports']
const requestedSection = String(route.query.section || '') as InventorySection
const tab = ref<InventorySection>(validSections.includes(requestedSection) && (requestedSection !== 'recipes' || auth.isSuperadmin) ? requestedSection : 'balances')
const expenses = ref<Expense[]>([])
const products = ref<Product[]>([])
const catalogsLoading = ref(false)
const catalogsError = ref<string | null>(null)
const saving = ref(false)
const recipeLoading = ref(false)
const loadedSections = reactive<Record<InventorySection, boolean>>({ balances: false, movements: false, counts: false, adjustments: true, transfers: false, catalog: false, recipes: false, reports: false })

const currentBranchId = computed(() => branches.selectedBranchId || auth.user?.branchId || 0)
const activeBranchName = computed(() => branches.selectedBranch?.name || auth.user?.branchName || 'Sucursal actual')
const isGlobalSection = computed(() => tab.value === 'catalog')
const activeDataSection = computed<InventoryDataSection | null>(() => ({ balances: 'balances', movements: 'movements', counts: 'counts', transfers: 'transfers', reports: 'reports' } as Partial<Record<InventorySection, InventoryDataSection>>)[tab.value] || null)
const activeSectionLoading = computed(() => catalogsLoading.value || (activeDataSection.value ? store.loadingBySection[activeDataSection.value] : saving.value))
const activeSectionError = computed(() => catalogsError.value || (activeDataSection.value ? store.errors[activeDataSection.value] : null))

const navigationGroups = computed(() => [
  { label: 'Operación', items: [{ id: 'balances' as const, label: 'Existencias' }, { id: 'movements' as const, label: 'Movimientos' }, { id: 'counts' as const, label: 'Conteos' }, { id: 'adjustments' as const, label: 'Ajustes' }, { id: 'transfers' as const, label: 'Transferencias' }] },
  { label: 'Configuración', items: [{ id: 'catalog' as const, label: 'Insumos' }, ...(auth.isSuperadmin ? [{ id: 'recipes' as const, label: 'Recetas' }] : [])] },
  { label: 'Análisis', items: [{ id: 'reports' as const, label: 'Teórico vs. real' }] },
])

const summaryCards = computed(() => [
  { label: 'Valor inventario', value: money(store.totalValue), hint: activeBranchName.value, icon: BanknotesIcon },
  { label: 'Con existencia', value: String(store.itemsWithStock), hint: 'insumos con saldo positivo', icon: CubeIcon },
  { label: 'Transferencias pendientes', value: String(store.pendingTransfers), hint: 'en camino a una sucursal', icon: ArrowsRightLeftIcon },
  { label: 'Último conteo', value: store.latestConfirmedCount ? shortDate(store.latestConfirmedCount.confirmedAt!) : 'Sin conteos', hint: store.latestConfirmedCount ? `Conteo #${store.latestConfirmedCount.id}` : 'pendiente de confirmar', icon: ClipboardDocumentCheckIcon },
])

const expenseById = (id: number) => expenses.value.find(item => item.id === id)
const expenseCategories = computed(() => Array.from(new Map(expenses.value.map(item => [item.categoryId, item.categoryName])).entries()).sort((a, b) => a[1].localeCompare(b[1])))
const expenseCategoryOptions = computed(() => [{ id: 0, name: 'Todas las categorías' }, ...expenseCategories.value.map(([id, name]) => ({ id, name }))])
const inventoryExpenses = computed(() => expenses.value.filter(item => item.tracksInventory && item.inventoryActive).sort((a, b) => a.name.localeCompare(b.name)))
const inventoryExpenseOptions = computed(() => [{ id: 0, name: 'Selecciona un insumo' }, ...inventoryExpenses.value.map(item => ({ id: item.id, name: item.name, description: item.categoryName }))])
const baseUnitOptions = [{ id: 'unit', name: 'Unidad' }, { id: 'gram', name: 'Gramo' }, { id: 'milliliter', name: 'Mililitro' }]
const unitFilterOptions = [{ id: 'all', name: 'Todas las unidades' }, ...baseUnitOptions]

const balanceFilters = reactive({ categoryId: 0, search: '', unit: 'all', status: 'all' })
const balanceStatusOptions = [{ id: 'all', name: 'Todos los estados' }, { id: 'positive', name: 'Con existencia' }, { id: 'reserved', name: 'Con reservas' }, { id: 'empty', name: 'Sin disponible' }, { id: 'negative', name: 'Existencia negativa' }]
const filteredBalances = computed(() => store.balances.filter(row => {
  const expense = expenseById(row.expenseId)
  if (balanceFilters.categoryId && expense?.categoryId !== balanceFilters.categoryId) return false
  if (!matchesInventorySearch(`${row.expenseName} ${expense?.categoryName || ''}`, balanceFilters.search)) return false
  if (balanceFilters.unit !== 'all' && row.baseUnit !== balanceFilters.unit) return false
  if (balanceFilters.status === 'positive' && row.quantityOnHand <= 0) return false
  if (balanceFilters.status === 'reserved' && row.quantityReserved <= 0) return false
  if (balanceFilters.status === 'empty' && row.quantityAvailable > 0) return false
  if (balanceFilters.status === 'negative' && row.quantityOnHand >= 0) return false
  return true
}))

const defaultMovementRange = inventoryDateRange(30)
const movementFilters = reactive({ from: defaultMovementRange.from, to: defaultMovementRange.to, search: '', type: 'all', origin: 'all' })
const movementTypes = ['opening_balance', 'purchase', 'reservation', 'reservation_release', 'estimated_consumption', 'strict_consumption', 'adjustment_increase', 'adjustment_decrease', 'waste', 'transfer_out', 'transfer_in', 'reversal']
const movementTypeOptions = [{ id: 'all', name: 'Todos los tipos' }, ...movementTypes.map(id => ({ id, name: movement(id) }))]
const movementOriginOptions = [{ id: 'all', name: 'Todos los orígenes' }, { id: 'order', name: 'Pedidos' }, { id: 'purchase', name: 'Compras' }, { id: 'transfer', name: 'Transferencias' }, { id: 'count', name: 'Conteos' }, { id: 'manual', name: 'Manual' }]
const movementOrigin = (row: InventoryMovement) => row.orderId ? 'order' : row.expenseHeaderId ? 'purchase' : row.transferId ? 'transfer' : row.inventoryCountId ? 'count' : 'manual'
const filteredMovements = computed(() => store.movements.filter(row => {
  const day = localDateKey(row.createdAt)
  return day >= movementFilters.from && day <= movementFilters.to
    && matchesInventorySearch(row.expenseName, movementFilters.search)
    && (movementFilters.type === 'all' || row.type === movementFilters.type)
    && (movementFilters.origin === 'all' || movementOrigin(row) === movementFilters.origin)
}))
function clearMovementFilters() { Object.assign(movementFilters, { from: defaultMovementRange.from, to: defaultMovementRange.to, search: '', type: 'all', origin: 'all' }) }
function openMovements(expenseId: number) { movementFilters.search = expenseById(expenseId)?.name || ''; void selectSection('movements') }

const countValues = reactive<Record<number, Record<number, number | null>>>({})
const countSearch = ref('')
const countPreviewOpen = ref(false)
const activeCount = computed(() => store.counts.find(item => item.status === 'draft') || null)
const confirmedCounts = computed(() => store.counts.filter(item => item.status === 'confirmed').slice(0, 10))
const filteredCountLines = computed(() => (activeCount.value?.lines || []).filter(line => matchesInventorySearch(`${line.expenseName} ${expenseById(line.expenseId)?.categoryName || ''}`, countSearch.value)))
const countProgress = computed(() => {
  if (!activeCount.value) return { completed: 0, total: 0, percent: 0 }
  const values = countValues[activeCount.value.id] || {}
  const completed = activeCount.value.lines.filter(line => typeof values[line.expenseId] === 'number').length
  return { completed, total: activeCount.value.lines.length, percent: activeCount.value.lines.length ? completed * 100 / activeCount.value.lines.length : 0 }
})
const countIsComplete = computed(() => !!activeCount.value && countProgress.value.completed === countProgress.value.total)
const countPreviewTotal = computed(() => activeCount.value?.lines.reduce((sum, line) => sum + countDifference(activeCount.value!.id, line.expenseId, line.expectedQuantity), 0) || 0)
const countPreviewDifferences = computed(() => activeCount.value?.lines.filter(line => countDifference(activeCount.value!.id, line.expenseId, line.expectedQuantity) !== 0).length || 0)
function initializeCounts() {
  for (const count of store.counts) {
    if (count.status !== 'draft' || countValues[count.id]) continue
    const stored = localStorage.getItem(countDraftStorageKey(auth.user?.id, count.branchId, count.id))
    countValues[count.id] = restoreCountDraft(count, stored)
  }
}
function countValue(countId: number, expenseId: number) { return countValues[countId]?.[expenseId] ?? null }
function setCountValue(count: InventoryCount, expenseId: number, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  countValues[count.id] ??= {}
  countValues[count.id][expenseId] = raw === '' ? null : Math.max(Number(raw), 0)
  localStorage.setItem(countDraftStorageKey(auth.user?.id, count.branchId, count.id), JSON.stringify(countValues[count.id]))
}
function countDifference(countId: number, expenseId: number, expected: number) { const value = countValue(countId, expenseId); return value == null ? 0 : value - expected }
function countTotalDifference(count: InventoryCount) { return count.lines.reduce((sum, line) => sum + (line.difference || 0), 0) }
async function startCount() {
  if (!await confirmDialog({ title: 'Iniciar conteo físico', message: 'Se creará un borrador con todos los insumos activos. Las cantidades deben registrarse físicamente y no se rellenarán con el valor teórico.', confirmLabel: 'Iniciar conteo' })) return
  await mutate(async () => { await inventoryApi.startCount(); await Promise.all([store.loadCounts(), store.loadBalances()]); initializeCounts() }, 'Conteo iniciado')
}
async function confirmCount(count: InventoryCount) {
  const values = countValues[count.id]
  await mutate(async () => {
    await inventoryApi.confirmCount(count.id, count.lines.map(line => ({ expenseId: line.expenseId, countedQuantity: Number(values[line.expenseId]) })))
    localStorage.removeItem(countDraftStorageKey(auth.user?.id, count.branchId, count.id))
    delete countValues[count.id]
    countPreviewOpen.value = false
    await Promise.all([store.loadCounts(), store.loadBalances(), store.loadMovements()])
  }, 'Conteo confirmado')
}

type AdjustmentType = 'increase' | 'decrease' | 'waste'
const adjustment = reactive<{ type: AdjustmentType; expenseId: number; quantity: number | null; reason: string }>({ type: 'increase', expenseId: 0, quantity: null, reason: '' })
const adjustmentTypes = [
  { id: 'increase' as const, label: 'Entrada', activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-700' },
  { id: 'decrease' as const, label: 'Salida', activeClass: 'border-blue-600 bg-blue-50 text-blue-700' },
  { id: 'waste' as const, label: 'Merma', activeClass: 'border-amber-600 bg-amber-50 text-amber-800' },
]
const selectedAdjustmentBalance = computed(() => store.balances.find(row => row.expenseId === adjustment.expenseId) || null)
const adjustmentDelta = computed(() => (adjustment.type === 'increase' ? 1 : -1) * Number(adjustment.quantity || 0))
const adjustmentResult = computed(() => (selectedAdjustmentBalance.value?.quantityOnHand || 0) + adjustmentDelta.value)
const adjustmentIsValid = computed(() => adjustment.expenseId > 0 && Number(adjustment.quantity) > 0 && adjustment.reason.trim().length >= 3)
function openAdjustment(expenseId: number) { adjustment.expenseId = expenseId; void selectSection('adjustments') }
async function saveAdjustment() {
  if (!adjustmentIsValid.value || !selectedAdjustmentBalance.value) return
  if (!await confirmDialog({ title: adjustment.type === 'waste' ? 'Registrar merma' : 'Registrar ajuste', message: `${expenseById(adjustment.expenseId)?.name}: ${signed(adjustmentDelta.value)} ${unit(selectedAdjustmentBalance.value.baseUnit)}. El saldo estimado quedará en ${qty(adjustmentResult.value)}.`, confirmLabel: 'Registrar', tone: adjustment.type === 'waste' || adjustmentResult.value < 0 ? 'warning' : 'default' })) return
  await mutate(async () => {
    await inventoryApi.adjust({ expenseId: adjustment.expenseId, quantityDelta: adjustmentDelta.value, reason: adjustment.reason.trim(), waste: adjustment.type === 'waste' })
    Object.assign(adjustment, { quantity: null, reason: '' })
    await Promise.all([store.loadBalances(), store.loadMovements()])
  }, adjustment.type === 'waste' ? 'Merma registrada' : 'Ajuste registrado')
}

const transfer = reactive<{ destinationBranchId: number; lines: Array<{ expenseId: number; quantity: number | null }> }>({ destinationBranchId: 0, lines: [{ expenseId: 0, quantity: null }] })
const receiveValues = reactive<Record<number, Record<number, number | null>>>({})
const receiveReasons = reactive<Record<number, string>>({})
const destinationBranchOptions = computed(() => [{ id: 0, name: 'Selecciona una sucursal' }, ...branches.options.filter(branch => branch.id !== currentBranchId.value)])
const transferIsValid = computed(() => transfer.destinationBranchId > 0 && transfer.lines.length > 0 && transfer.lines.every(line => line.expenseId > 0 && Number(line.quantity) > 0 && Number(line.quantity) <= availableStock(line.expenseId)) && new Set(transfer.lines.map(line => line.expenseId)).size === transfer.lines.length)
function availableStock(expenseId: number) { return store.balances.find(row => row.expenseId === expenseId)?.quantityAvailable || 0 }
function transferLineHint(expenseId: number) { const row = store.balances.find(item => item.expenseId === expenseId); return row ? `Disponible: ${qty(row.quantityAvailable)} ${unit(row.baseUnit)}` : 'Selecciona un insumo' }
function initializeTransfers() { for (const item of store.transfers) receiveValues[item.id] ??= Object.fromEntries(item.lines.map(line => [line.expenseId, line.receivedQuantity ?? line.quantity])) }
async function createTransfer() {
  if (!transferIsValid.value) return
  const destination = branches.options.find(item => item.id === transfer.destinationBranchId)?.name
  if (!await confirmDialog({ title: 'Crear transferencia', message: `Se creará un borrador de ${activeBranchName.value} hacia ${destination} con ${transfer.lines.length} insumo(s).`, confirmLabel: 'Crear borrador' })) return
  await mutate(async () => {
    await inventoryApi.createTransfer({ sourceBranchId: currentBranchId.value, destinationBranchId: transfer.destinationBranchId, lines: transfer.lines.map(line => ({ expenseId: line.expenseId, quantity: Number(line.quantity) })) })
    Object.assign(transfer, { destinationBranchId: 0, lines: [{ expenseId: 0, quantity: null }] })
    await store.loadTransfers(); initializeTransfers()
  }, 'Transferencia creada')
}
async function dispatch(item: InventoryTransfer) {
  if (!await confirmDialog({ title: 'Despachar transferencia', message: `Se descontarán ${item.lines.length} insumo(s) de ${item.sourceBranchName}.`, confirmLabel: 'Despachar', tone: 'warning' })) return
  await mutate(async () => { await inventoryApi.dispatchTransfer(item.id); await Promise.all([store.loadTransfers(), store.loadBalances(), store.loadMovements()]); initializeTransfers() }, 'Transferencia despachada')
}
function transferHasDifference(item: InventoryTransfer) { return item.lines.some(line => Number(receiveValues[item.id]?.[line.expenseId]) !== line.quantity) }
async function receive(item: InventoryTransfer) {
  if (!await confirmDialog({ title: 'Confirmar recepción', message: transferHasDifference(item) ? 'La recepción tiene diferencias. Se guardarán las cantidades reales y el motivo registrado.' : `Se ingresarán los insumos a ${item.destinationBranchName}.`, confirmLabel: 'Confirmar recibido', tone: transferHasDifference(item) ? 'warning' : 'default' })) return
  await mutate(async () => {
    await inventoryApi.receiveTransfer(item.id, { lines: item.lines.map(line => ({ expenseId: line.expenseId, receivedQuantity: Number(receiveValues[item.id][line.expenseId]) })), differenceReason: receiveReasons[item.id]?.trim() || undefined })
    await Promise.all([store.loadTransfers(), store.loadBalances(), store.loadMovements()]); initializeTransfers()
  }, 'Transferencia recibida')
}

const catalogFilters = reactive({ categoryId: 0, search: '', status: 'all' })
const catalogStatusOptions = [{ id: 'all', name: 'Todos' }, { id: 'active', name: 'Inventario activo' }, { id: 'inactive', name: 'Inventario inactivo' }, { id: 'unconfigured', name: 'Sin presentaciones' }]
const filteredCatalog = computed(() => expenses.value.filter(item => {
  if (catalogFilters.categoryId && item.categoryId !== catalogFilters.categoryId) return false
  if (!matchesInventorySearch(item.name, catalogFilters.search)) return false
  if (catalogFilters.status === 'active' && !item.inventoryActive) return false
  if (catalogFilters.status === 'inactive' && item.inventoryActive) return false
  if (catalogFilters.status === 'unconfigured' && item.inventoryConversions.length > 0) return false
  return true
}).sort((a, b) => a.name.localeCompare(b.name)))
const selectedCatalogIds = ref<number[]>([])
const catalogTemplateId = ref(0)
const catalogEditorExpenseId = ref(0)
const catalogEditor = reactive<{ active: boolean; baseUnit: 'unit' | 'gram' | 'milliliter'; conversions: Array<{ name: string; baseQuantity: number | null; active: boolean }> }>({ active: false, baseUnit: 'unit', conversions: [] })
const catalogEditorInitial = ref('')
const bulkPreviewOpen = ref(false)
const allVisibleCatalogSelected = computed(() => filteredCatalog.value.length > 0 && filteredCatalog.value.every(item => selectedCatalogIds.value.includes(item.id)))
const catalogTemplate = computed(() => expenses.value.find(item => item.id === catalogTemplateId.value) || null)
const catalogBulkTargets = computed(() => expenses.value.filter(item => selectedCatalogIds.value.includes(item.id) && item.id !== catalogTemplateId.value))
const catalogTemplateHasConversions = computed(() => !!catalogTemplate.value?.inventoryConversions.length)
const catalogEditorIsValid = computed(() => catalogEditor.conversions.length > 0 && catalogEditor.conversions.every(item => item.name.trim() && Number(item.baseQuantity) > 0))
function toggleAllVisibleCatalog(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const visibleIds = filteredCatalog.value.map(item => item.id)
  selectedCatalogIds.value = checked ? Array.from(new Set([...selectedCatalogIds.value, ...visibleIds])) : selectedCatalogIds.value.filter(id => !visibleIds.includes(id))
  if (!selectedCatalogIds.value.includes(catalogTemplateId.value)) catalogTemplateId.value = selectedCatalogIds.value[0] || 0
}
function clearCatalogSelection() { selectedCatalogIds.value = []; catalogTemplateId.value = 0 }
function openCatalogEditor(item: Expense) {
  if (catalogEditorExpenseId.value === item.id) { closeCatalogEditor(); return }
  catalogEditorExpenseId.value = item.id
  catalogEditor.active = item.inventoryActive
  catalogEditor.baseUnit = item.inventoryBaseUnit
  catalogEditor.conversions = item.inventoryConversions.map(conversion => ({ name: conversion.name, baseQuantity: conversion.baseQuantity, active: conversion.active }))
  catalogEditorInitial.value = JSON.stringify(catalogEditor)
}
function closeCatalogEditor() { catalogEditorExpenseId.value = 0; catalogEditorInitial.value = ''; branches.markDirty('inventory-catalog', false) }
async function saveCatalog() {
  const item = expenseById(catalogEditorExpenseId.value)
  if (!item || !catalogEditorIsValid.value) return
  await mutate(async () => {
    await expenseApi.updateExpense(item.id, expenseInventoryPayload(item, { active: catalogEditor.active, baseUnit: catalogEditor.baseUnit, conversions: catalogEditor.conversions.map(row => ({ name: row.name, baseQuantity: Number(row.baseQuantity), active: row.active })) }))
    await loadCatalogs(); closeCatalogEditor()
  }, 'Configuración guardada')
}
async function applyCatalogTemplate() {
  const source = catalogTemplate.value
  if (!source || !source.inventoryConversions.length) return
  saving.value = true
  const failed: string[] = []
  try {
    const configuration = { active: source.inventoryActive, baseUnit: source.inventoryBaseUnit, conversions: source.inventoryConversions.map(row => ({ name: row.name, baseQuantity: row.baseQuantity, active: row.active })) }
    for (const target of catalogBulkTargets.value) {
      try { await expenseApi.updateExpense(target.id, expenseInventoryPayload(target, configuration)) } catch { failed.push(target.name) }
    }
    await loadCatalogs()
    bulkPreviewOpen.value = false
    clearCatalogSelection()
    if (failed.length) toast.error('Aplicación parcial', `${failed.length} insumo(s) requieren revisión: ${failed.join(', ')}`)
    else toast.success('Configuración aplicada', 3500)
  } finally { saving.value = false }
}

const recipeFilters = reactive({ categoryId: 0, search: '', status: 'all' })
const recipeStatusOptions = [{ id: 'all', name: 'Todos' }, { id: 'active', name: 'Inventario activo' }, { id: 'inactive', name: 'Sin activar' }, { id: 'strict', name: 'Control estricto' }, { id: 'estimated', name: 'Control estimado' }]
const recipeModeOptions = [{ id: 'estimated', name: 'Estimado — no bloquea ventas' }, { id: 'strict', name: 'Estricto — bloquea al agotarse' }]
const branchProducts = computed(() => products.value.filter(product => !currentBranchId.value || product.branchId === currentBranchId.value))
const productCategories = computed(() => Array.from(new Map(branchProducts.value.map(product => [product.categoryId, product.categoryName])).entries()).sort((a, b) => a[1].localeCompare(b[1])))
const productCategoryOptions = computed(() => [{ id: 0, name: 'Todas las categorías' }, ...productCategories.value.map(([id, name]) => ({ id, name }))])
const filteredProducts = computed(() => branchProducts.value.filter(product => {
  if (recipeFilters.categoryId && product.categoryId !== recipeFilters.categoryId) return false
  if (!matchesInventorySearch(product.name, recipeFilters.search)) return false
  if (recipeFilters.status === 'active' && !product.inventoryEnabled) return false
  if (recipeFilters.status === 'inactive' && product.inventoryEnabled) return false
  if (recipeFilters.status === 'strict' && product.inventoryControlMode !== 'strict') return false
  if (recipeFilters.status === 'estimated' && product.inventoryControlMode !== 'estimated') return false
  return true
}).sort((a, b) => a.name.localeCompare(b.name)))
const recipeProductId = ref(0)
const recipe = reactive<{ enabled: boolean; mode: 'estimated' | 'strict'; requirements: Array<{ expenseId: number; baseQuantity: number | null }> }>({ enabled: false, mode: 'estimated', requirements: [] })
const selectedRecipeProduct = computed(() => products.value.find(product => product.id === recipeProductId.value))
const recipeBlockers = computed(() => recipe.requirements.flatMap(requirement => {
  if (!requirement.expenseId) return ['Hay una fila sin insumo seleccionado.']
  if (!store.balances.some(row => row.expenseId === requirement.expenseId)) return [`${expenseById(requirement.expenseId)?.name || 'Insumo'} no tiene conteo de apertura en ${activeBranchName.value}.`]
  return []
}))
const recipeIsValid = computed(() => recipeProductId.value > 0 && recipe.requirements.length > 0 && recipe.requirements.every(row => row.expenseId > 0 && Number(row.baseQuantity) > 0) && new Set(recipe.requirements.map(row => row.expenseId)).size === recipe.requirements.length && (!recipe.enabled || recipeBlockers.value.length === 0))
async function selectRecipeProduct(productId: number) {
  recipeProductId.value = productId
  recipeLoading.value = true
  try {
    const value = await inventoryApi.getRecipe(productId)
    recipe.enabled = value.inventoryEnabled
    recipe.mode = value.controlMode
    recipe.requirements = value.requirements.map(row => ({ expenseId: row.expenseId, baseQuantity: row.baseQuantity }))
  } catch (cause: any) { toast.error('No se pudo cargar la receta', cause?.message) } finally { recipeLoading.value = false }
}
async function saveRecipe() {
  if (!recipeIsValid.value) return
  await mutate(async () => {
    const value = await inventoryApi.setRecipe(recipeProductId.value, { controlMode: recipe.mode, enabled: recipe.enabled, requirements: recipe.requirements.map(row => ({ expenseId: row.expenseId, baseQuantity: Number(row.baseQuantity) })) })
    const product = products.value.find(item => item.id === recipeProductId.value)
    if (product) { product.inventoryEnabled = value.inventoryEnabled; product.inventoryControlMode = value.controlMode }
  }, 'Receta guardada')
}

const initialReportRange = inventoryDateRange(30)
const fromDate = ref(initialReportRange.from)
const toDate = ref(initialReportRange.to)
const reportPresetDays = ref(30)
const reportPresets = [{ days: 7, label: 'Esta semana' }, { days: 30, label: 'Últimos 30 días' }, { days: 0, label: 'Personalizado' }]
const reportFilters = reactive({ categoryId: 0, search: '' })
const reportExpenseId = ref(0)
const filteredReport = computed(() => store.report.filter(row => {
  const expense = expenseById(row.expenseId)
  return (!reportFilters.categoryId || expense?.categoryId === reportFilters.categoryId) && matchesInventorySearch(row.expenseName, reportFilters.search)
}))
const reportMetrics = computed(() => {
  const estimated = filteredReport.value.reduce((sum, row) => sum + row.estimatedConsumption + row.strictConsumption, 0)
  const waste = filteredReport.value.reduce((sum, row) => sum + row.waste, 0)
  const difference = filteredReport.value.reduce((sum, row) => sum + Math.abs(row.latestDifference || 0), 0)
  const expected = filteredReport.value.reduce((sum, row) => sum + Math.abs(row.latestExpected || 0), 0)
  return [
    { label: 'Consumo teórico', value: qty(estimated), class: 'text-gray-900' },
    { label: 'Mermas', value: qty(waste), class: 'text-amber-700' },
    { label: 'Diferencia absoluta', value: qty(difference), class: difference ? 'text-red-600' : 'text-emerald-700' },
    { label: 'Diferencia porcentual', value: expected ? `${qty(difference / expected * 100)}%` : '—', class: 'text-gray-900' },
  ]
})
const reportExpenseOptions = computed(() => filteredReport.value.map(row => ({ id: row.expenseId, name: row.expenseName })))
const selectedDeviation = computed(() => store.deviation.filter(point => point.expenseId === reportExpenseId.value).sort((a, b) => new Date(a.countedAt).getTime() - new Date(b.countedAt).getTime()))
let applyingReportPreset = false
function applyReportPreset(days: number) {
  reportPresetDays.value = days
  if (!days) return
  applyingReportPreset = true
  const range = inventoryDateRange(days)
  fromDate.value = range.from
  toDate.value = range.to
  void nextTick(() => { applyingReportPreset = false })
  void loadReports()
}
function reportRange() { const from = new Date(`${fromDate.value}T00:00:00`); const to = new Date(`${toDate.value}T00:00:00`); to.setDate(to.getDate() + 1); return { from: from.toISOString(), to: to.toISOString() } }
async function loadReports() { const range = reportRange(); await safe(() => store.loadReports(range.from, range.to)); loadedSections.reports = true; if (!reportExpenseId.value || !store.report.some(row => row.expenseId === reportExpenseId.value)) reportExpenseId.value = store.report[0]?.expenseId || 0 }
function deviationBarWidth(value: number) { const max = Math.max(...selectedDeviation.value.map(point => Math.abs(point.difference)), 1); return Math.max(Math.abs(value) / max * 100, 8) }

async function loadCatalogs(includeProducts = false) {
  catalogsLoading.value = true
  catalogsError.value = null
  try {
    const [expenseResponse, productResponse] = await Promise.all([
      expenseApi.getAllExpenses(),
      includeProducts ? productApi.getProducts({ branchId: currentBranchId.value, page: 1, pageSize: 500 }) : Promise.resolve(null),
    ])
    expenses.value = expenseResponse.data || []
    if (productResponse) products.value = productResponse.data?.items || []
    loadedSections.catalog = true
    if (includeProducts) loadedSections.recipes = true
  } catch (cause: any) { catalogsError.value = cause?.message || 'No se pudieron cargar los catálogos' } finally { catalogsLoading.value = false }
}
async function safe(work: () => Promise<unknown>) { try { await work() } catch {} }
async function mutate(work: () => Promise<void>, success: string) {
  saving.value = true
  try { await work(); toast.success(success, 3500) } catch (cause: any) { toast.error('No fue posible completar la operación', cause?.message) } finally { saving.value = false }
}
async function ensureSection(section: InventorySection, force = false) {
  if (!force && loadedSections[section]) return
  if (section === 'balances') await safe(() => store.loadBalances())
  else if (section === 'movements') await safe(() => store.loadMovements())
  else if (section === 'counts') { await safe(() => store.loadCounts()); initializeCounts() }
  else if (section === 'transfers') { await safe(() => store.loadTransfers()); initializeTransfers() }
  else if (section === 'reports') await loadReports()
  else if (section === 'catalog' && (!expenses.value.length || force)) await loadCatalogs()
  else if (section === 'recipes' && (!loadedSections.recipes || force)) await loadCatalogs(true)
  loadedSections[section] = true
}
async function refreshActiveSection() {
  if (tab.value === 'catalog') await loadCatalogs()
  else if (tab.value === 'recipes') await loadCatalogs(true)
  else await ensureSection(tab.value, true)
  if (!['balances', 'counts', 'transfers'].includes(tab.value)) await Promise.all([safe(() => store.loadBalances()), safe(() => store.loadCounts()), safe(() => store.loadTransfers())])
}
async function selectSection(section: InventorySection) {
  if (section === tab.value) return
  tab.value = section
  await router.replace({ query: { ...route.query, section } })
  await ensureSection(section)
}

watch(() => route.query.section, value => {
  const section = String(value || '') as InventorySection
  if (validSections.includes(section) && section !== tab.value && (section !== 'recipes' || auth.isSuperadmin)) { tab.value = section; void ensureSection(section) }
})
watch([fromDate, toDate], () => { if (!applyingReportPreset) reportPresetDays.value = 0 })
watch(selectedCatalogIds, ids => { if (!ids.includes(catalogTemplateId.value)) catalogTemplateId.value = ids[0] || 0 }, { deep: true })
watch(catalogEditor, value => { branches.markDirty('inventory-catalog', !!catalogEditorExpenseId.value && JSON.stringify(value) !== catalogEditorInitial.value) }, { deep: true })
watch(reportExpenseOptions, options => { if (!options.some(option => option.id === reportExpenseId.value)) reportExpenseId.value = options[0]?.id || 0 })
watch(() => branches.revision, async () => {
  recipeProductId.value = 0
  Object.assign(loadedSections, { balances: false, movements: false, counts: false, transfers: false, reports: false })
  await Promise.all([safe(() => store.loadBalances()), safe(() => store.loadCounts()), safe(() => store.loadTransfers())])
  initializeCounts(); initializeTransfers(); loadedSections.balances = loadedSections.counts = loadedSections.transfers = true
  if (tab.value === 'recipes') await loadCatalogs(true)
  else if (!['balances', 'counts', 'transfers', 'catalog'].includes(tab.value)) await ensureSection(tab.value, true)
})

const handleInventoryChanged = (payload: { branchId?: number }) => { if (!payload?.branchId || payload.branchId === currentBranchId.value) void Promise.all([store.loadBalances(), tab.value === 'movements' ? store.loadMovements() : Promise.resolve(), tab.value === 'counts' ? store.loadCounts() : Promise.resolve()]) }
const handleTransferPending = (payload: { branchId?: number }) => { if (!payload?.branchId || payload.branchId === currentBranchId.value) void store.loadTransfers().then(initializeTransfers) }
onMounted(async () => {
  onSignalR('InventoryChanged', handleInventoryChanged)
  onSignalR('InventoryTransferPending', handleTransferPending)
  await Promise.all([loadCatalogs(tab.value === 'recipes'), safe(() => store.loadBalances()), safe(() => store.loadCounts()), safe(() => store.loadTransfers())])
  initializeCounts(); initializeTransfers(); loadedSections.balances = loadedSections.counts = loadedSections.transfers = true
  await ensureSection(tab.value)
})
onBeforeUnmount(() => { offSignalR('InventoryChanged', handleInventoryChanged); offSignalR('InventoryTransferPending', handleTransferPending); branches.markDirty('inventory-catalog', false) })

const qty = (value: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(Number(value) || 0)
const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value) || 0)
const date = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value))
const shortDate = (value: string) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', timeZone: 'America/Bogota' }).format(new Date(value))
const localDateKey = (value: string) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }).format(new Date(value))
const signed = (value: number) => `${value > 0 ? '+' : ''}${qty(value)}`
const unit = (value: string) => ({ unit: 'un', gram: 'g', milliliter: 'ml' }[value] || value)
function movement(value: string) { return ({ opening_balance: 'Apertura', purchase: 'Compra', reservation: 'Reserva', reservation_release: 'Liberación', estimated_consumption: 'Consumo estimado', strict_consumption: 'Consumo estricto', adjustment_increase: 'Ajuste +', adjustment_decrease: 'Ajuste -', waste: 'Merma', transfer_out: 'Transferencia salida', transfer_in: 'Transferencia entrada', reversal: 'Reversión' } as Record<string, string>)[value] || value }
const movementSource = (row: InventoryMovement) => row.orderId ? `Pedido #${row.orderId}` : row.expenseHeaderId ? `Compra #${row.expenseHeaderId}` : row.transferId ? `Transferencia #${row.transferId}` : row.inventoryCountId ? `Conteo #${row.inventoryCountId}` : row.reason || 'Manual'
const movementBadge = (type: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' => type === 'purchase' || type === 'transfer_in' || type === 'opening_balance' ? 'success' : type === 'waste' || type === 'adjustment_decrease' ? 'danger' : type.includes('reservation') ? 'warning' : type.includes('consumption') || type === 'transfer_out' ? 'info' : 'secondary'
const deltaClass = (value: number) => value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-600' : 'text-gray-500'
const transferStatus = (status: string) => ({ draft: 'Borrador', dispatched: 'Despachada', received: 'Recibida', received_with_difference: 'Recibida con diferencia' } as Record<string, string>)[status] || status
const transferBadge = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' => status === 'received' ? 'success' : status === 'received_with_difference' ? 'warning' : status === 'dispatched' ? 'info' : 'secondary'
</script>
