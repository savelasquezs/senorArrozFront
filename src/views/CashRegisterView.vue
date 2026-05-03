<template>
  <MainLayout>
    <div class="p-4 space-y-4 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Cuadre de Caja</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Último cuadre:
            <span v-if="expected?.lastClosureAt" class="font-medium text-gray-700">
              {{ formatDate(expected.lastClosureAt) }}
            </span>
            <span v-else class="text-orange-500">Sin cuadres previos</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton v-if="canViewClosureHistory" variant="outline" size="sm" @click="showHistoryModal = true">
            Historial de cuadres
          </BaseButton>
          <BaseButton @click="loadData" variant="outline" size="sm" :loading="loading">
            <ArrowPathIcon class="w-4 h-4 mr-1" /> Actualizar
          </BaseButton>
        </div>
      </div>

      <div v-if="expected && expected.undeliveredOrdersCount > 0"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 flex items-start gap-2"
        role="alert">
        <ExclamationCircleIcon class="w-5 h-5 shrink-0 text-red-600" />
        <span>
          <strong>No puedes guardar el cuadre:</strong>
          {{
            expected.undeliveredOrdersCount === 1
              ? ' hay 1 pedido sin entregar.'
              : ` hay ${expected.undeliveredOrdersCount} pedidos sin entregar.`
          }}
          Entrega o cancela esos pedidos antes de cuadrar caja.
        </span>
      </div>

      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-gray-100 animate-pulse rounded-lg h-40" />
      </div>

      <template v-else-if="expected">
        <div class="flex flex-col gap-4">
          <!-- Balance global del período -->
          <div class="rounded-xl border px-4 py-3"
            :class="globalCuadred ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-200 bg-amber-50/80'">
            <h2 class="text-sm font-semibold text-gray-900 mb-2">Balance global del período</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p class="text-xs text-gray-500">Esperado (sistema)</p>
                <p class="font-bold tabular-nums text-gray-900">{{ formatCurrency(expected.expectedGlobalTotal) }}</p>
                <p class="text-[11px] text-gray-500 mt-1 leading-snug">
                  Apert. (caja+bancos+L+apps snapshot
                  <span v-if="(expected.openingUnsettledAppsTotal ?? 0) !== 0" class="font-medium">
                    ; apps en apert.: {{ formatCurrency(expected.openingUnsettledAppsTotal ?? 0) }}
                  </span>
                  ) {{ formatCurrency(expected.openingGlobalTotal) }} + ventas
                  {{ formatCurrency(expected.salesInPeriodTotal) }} − gastos
                  {{ formatCurrency(expected.expensesInPeriodTotal)
                  }}<template v-if="(expected.reservationDepositsAddedToGlobalTotal ?? 0) !== 0">
                    + abonos reserva (entrega pedido ≠ hoy CO)
                    {{ formatCurrency(expected.reservationDepositsAddedToGlobalTotal ?? 0) }}
                  </template>. El global contado suma préstamos activos y pendiente en apps no liquidado.
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Contado (caja + bancos + apps pend. + prést. activos)</p>
                <p class="font-bold tabular-nums text-gray-900">{{ formatCurrency(countedGlobalTotal) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Diferencia</p>
                <p class="font-bold tabular-nums" :class="globalCuadred ? 'text-emerald-800' : 'text-amber-900'">
                  {{ formatCurrency(globalDifference) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Apps: pendiente por liquidar (suma al total global contado; se guarda snapshot al cerrar) -->
          <div v-if="(expected.unsettledAppLines?.length ?? 0) > 0 || (expected.unsettledAppsTotal ?? 0) > 0"
            class="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3">
            <h2 class="text-sm font-semibold text-gray-900 mb-2">Pendiente por liquidar en apps</h2>
            <p class="text-[11px] text-violet-900/80 mb-2 leading-snug">
              Dinero en pedidos entregados aún sin liquidar a cuenta bancaria. Se incluye en el total global contado y
              se
              guarda por app al cerrar para la base del día siguiente.
            </p>
            <div class="overflow-x-auto rounded-lg border border-violet-100 bg-white/80">
              <table class="min-w-full text-sm">
                <thead class="bg-violet-100/80 text-left text-xs text-gray-600">
                  <tr>
                    <th class="px-3 py-2">App</th>
                    <th class="px-3 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-violet-100">
                  <tr v-for="line in expected.unsettledAppLines ?? []" :key="line.appId">
                    <td class="px-3 py-1.5 font-medium text-gray-800">{{ line.appName }}</td>
                    <td class="px-3 py-1.5 text-right tabular-nums">{{ formatCurrency(line.amount) }}</td>
                  </tr>
                </tbody>
                <tfoot class="bg-violet-50/90 font-semibold text-gray-900">
                  <tr>
                    <td class="px-3 py-2">Total apps pendientes</td>
                    <td class="px-3 py-2 text-right tabular-nums">{{ formatCurrency(expected.unsettledAppsTotal ?? 0) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div v-else class="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-xs text-gray-600">
            Sin pendiente por liquidar en apps (o todo ya liquidado a banco en el período).
          </div>

          <div class="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            <div class="min-w-0 space-y-4">
              <!-- ===== SECCIÓN 1: EFECTIVO ===== -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-0">
                <div class="bg-yellow-50 border-b border-yellow-100 px-4 py-2.5 flex items-center gap-2">
                  <BanknotesIcon class="w-4 h-4 text-yellow-600 shrink-0" />
                  <h2 class="text-base font-semibold text-gray-800">Conteo de Efectivo</h2>
                </div>

                <div class="p-4 space-y-3">
                  <!-- Denominaciones -->
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2">
                    <div v-for="denom in DENOMINATIONS" :key="denom" class="flex flex-col items-center gap-0.5">
                      <span class="text-[10px] sm:text-xs font-medium text-gray-500 leading-tight text-center">{{
                        formatCurrency(denom)
                        }}</span>
                      <input type="number" min="0" v-model.number="denominationCounts[denom]"
                        @input="onDenominationInput" @blur="onDenominationBlur(denom)"
                        class="w-full text-center border border-gray-300 rounded-md py-1 px-0.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="0" />
                      <span class="text-[10px] text-gray-400 leading-tight tabular-nums">
                        = {{ formatCurrency(denom * (denominationCounts[denom] || 0)) }}
                      </span>
                    </div>
                  </div>

                  <!-- Totales -->
                  <div class="grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                    <div class="bg-gray-50 rounded-lg p-2 sm:p-2.5 text-center">
                      <p class="text-[10px] sm:text-xs text-gray-500">Apertura efectivo (último cierre)</p>
                      <p class="text-base sm:text-lg font-bold text-gray-700 tabular-nums">
                        {{ formatCurrency(expected.openingCash) }}
                      </p>
                    </div>
                    <div class="bg-yellow-50/80 rounded-lg p-2 sm:p-2.5 text-center">
                      <p class="text-[10px] sm:text-xs text-gray-500">Contado en caja</p>
                      <p class="text-base sm:text-lg font-bold text-yellow-900 tabular-nums">
                        {{ formatCurrency(closingCash) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ===== SECCIÓN 2: PRÉSTAMOS INFORMALES ===== -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button type="button"
                  class="w-full text-left bg-orange-50 border-b border-orange-100 px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-orange-100/60 transition-colors"
                  @click="loansSectionExpanded = !loansSectionExpanded">
                  <div class="flex items-center gap-2 min-w-0">
                    <ClockIcon class="w-4 h-4 text-orange-600 shrink-0" />
                    <span class="text-base font-semibold text-gray-800 truncate">Préstamos informales</span>
                    <span v-if="!loansSectionExpanded" class="text-xs text-gray-600 truncate hidden sm:inline">
                      · {{ loansCollapsedSummary }}
                    </span>
                  </div>
                  <ChevronDownIcon :class="[
                    'w-5 h-5 text-orange-700 shrink-0 transition-transform',
                    loansSectionExpanded ? 'rotate-180' : '',
                  ]" />
                </button>
                <p v-if="!loansSectionExpanded"
                  class="px-4 py-1.5 text-xs text-gray-500 sm:hidden border-b border-orange-100/50">
                  {{ loansCollapsedSummary }}
                </p>

                <div v-show="loansSectionExpanded" class="border-t border-orange-100/60">
                  <div class="px-4 py-2 flex flex-wrap justify-end">
                    <div class="flex rounded-md border border-orange-200/80 bg-gray-50/80 p-0.5 text-xs sm:text-sm">
                      <button type="button" :class="[
                        'px-2 sm:px-3 py-1 rounded font-medium transition-colors',
                        loansTab === 'active' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-orange-50',
                      ]" @click="loansTab = 'active'">
                        Activos
                      </button>
                      <button type="button" :class="[
                        'px-2 sm:px-3 py-1 rounded font-medium transition-colors',
                        loansTab === 'inactive' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-orange-50',
                      ]" @click="loansTab = 'inactive'">
                        Inactivos
                      </button>
                    </div>
                  </div>

                  <div class="p-4 pt-0">
                    <p class="text-xs text-gray-500 mb-3">
                      Se guardan al instante. Los activos suman al total global contado (efectivo del negocio que no
                      está en el
                      cajón en este momento).
                    </p>

                    <div v-if="informalLoansLoading" class="text-center py-6 text-gray-500 text-sm">Cargando…</div>

                    <template v-else>
                      <div v-if="branchInformalLoans.length === 0" class="text-center py-4 text-gray-400 text-sm">
                        {{ loansTab === 'active' ? 'Sin préstamos activos' : 'Sin préstamos dados de baja' }}
                      </div>

                      <div v-else class="space-y-1.5">
                        <div v-for="loan in branchInformalLoans" :key="loan.id"
                          class="flex flex-col gap-1 p-2 bg-gray-50 rounded-lg sm:flex-row sm:items-center sm:gap-2">
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">{{ loan.concept }}</p>
                            <p class="text-xs text-gray-500 tabular-nums">{{ formatCurrency(loan.amount) }}</p>
                            <p v-if="loansTab === 'inactive' && loan.deactivatedAt"
                              class="text-xs text-gray-400 mt-0.5">
                              Baja: {{ formatDate(loan.deactivatedAt) }}
                              <span v-if="loan.deactivatedByName"> · {{ loan.deactivatedByName }}</span>
                            </p>
                            <p v-if="loansTab === 'inactive' && loan.deactivationNotes"
                              class="text-xs text-gray-500 mt-0.5 italic">
                              {{ loan.deactivationNotes }}
                            </p>
                          </div>
                          <div v-if="loansTab === 'active'" class="shrink-0">
                            <BaseButton variant="outline" size="sm" class="text-red-700 border-red-200 text-xs py-0.5"
                              @click="openDeactivateLoan(loan)">
                              Dar de baja
                            </BaseButton>
                          </div>
                        </div>
                      </div>

                      <div v-if="loansTab === 'active' && branchInformalLoans.length > 0" class="mt-2 flex justify-end">
                        <span class="text-xs sm:text-sm font-medium text-gray-700">
                          Total activos: {{ formatCurrency(totalActiveLoans) }}
                        </span>
                      </div>

                      <div v-if="loansTab === 'active'" class="mt-4 pt-3 border-t border-gray-100">
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                          <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Registrar préstamo
                          </p>
                          <BaseButton variant="outline" size="sm"
                            class="text-xs shrink-0 border-orange-200 text-orange-800"
                            @click="openDeliveryAdvanceModal">
                            Pedidos domicilio…
                          </BaseButton>
                        </div>
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div class="flex-1 min-w-0">
                            <label class="text-xs text-gray-500 block mb-0.5">Concepto</label>
                            <input v-model="newLoanConcept" type="text" placeholder="Ej. Domiciliario ruta noche"
                              class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          </div>
                          <div class="w-full sm:w-36 shrink-0">
                            <label class="text-xs text-gray-500 block mb-0.5">Monto (COP)</label>
                            <input v-model.number="newLoanAmount" type="number" step="1000" placeholder="0"
                              class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          </div>
                          <BaseButton variant="primary" class="shrink-0" size="sm" :loading="savingLoan"
                            @click="submitNewLoan">
                            <PlusIcon class="w-4 h-4 mr-1" /> Registrar
                          </BaseButton>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="min-w-0 space-y-4">
              <!-- ===== CAJA MAYOR EFECTIVO ===== -->
              <div v-if="canViewClosureHistory && cashVaultBank"
                class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  class="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex items-start gap-2 min-w-0">
                    <BuildingLibraryIcon class="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <div class="min-w-0">
                      <h2 class="text-base font-semibold text-gray-800">{{ cashVaultBank.bankName }}</h2>
                      <p class="text-[11px] sm:text-xs text-gray-500 leading-snug">
                        Esperado período:
                        <span class="font-semibold text-gray-700 tabular-nums">{{
                          formatCurrency(cashVaultBank.expectedBalance)
                        }}</span>
                        <span class="hidden sm:inline"> · Efectivo en caja mayor (no es transferencia entre
                          bancos).</span>
                      </p>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-1.5 shrink-0">
                    <BaseButton variant="outline" size="sm" class="text-xs py-1" @click="openVaultAbono">Abonar
                    </BaseButton>
                    <BaseButton variant="outline" size="sm" class="text-xs py-1 text-amber-800 border-amber-200"
                      @click="openVaultDescarga">
                      Descargar
                    </BaseButton>
                  </div>
                </div>
              </div>

              <!-- ===== SECCIÓN 3: BANCOS ===== -->
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center gap-2">
                  <BuildingLibraryIcon class="w-4 h-4 text-blue-600 shrink-0" />
                  <h2 class="text-base font-semibold text-gray-800">Bancos y Aplicaciones</h2>
                </div>

                <div class="p-4 space-y-3">
                  <p class="text-xs text-gray-500 leading-snug">
                    Saldo real por cuenta; la diferencia debe ser <strong>$0</strong> para guardar.
                  </p>

                  <div v-if="bankReconciliations.length === 0" class="text-center py-4 text-gray-400 text-sm">
                    No hay bancos configurados para esta sucursal.
                  </div>

                  <div v-else class="space-y-2">
                    <div v-for="recon in bankReconciliations" :key="recon.bankId"
                      class="grid grid-cols-4 gap-2 items-center p-2 rounded-lg"
                      :class="recon.actualBalance - recon.expectedBalance === 0 ? 'bg-green-50' : 'bg-red-50'">
                      <div class="col-span-1 min-w-0">
                        <p class="text-xs sm:text-sm font-medium text-gray-800 truncate">{{ recon.bankName }}</p>
                        <p class="text-[10px] sm:text-xs text-gray-400 tabular-nums">
                          Sis.: {{ formatCurrency(recon.expectedBalance) }}
                        </p>
                      </div>
                      <div class="col-span-1">
                        <label class="text-[10px] text-gray-500 block mb-0.5">Saldo real</label>
                        <input v-model.number="recon.actualBalance" type="number" min="0" step="100"
                          class="w-full border border-gray-300 rounded-md px-2 py-1 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      <div class="col-span-1 text-center">
                        <p class="text-[10px] text-gray-500">Dif.</p>
                        <p :class="[
                          'text-sm sm:text-base font-bold tabular-nums',
                          recon.actualBalance - recon.expectedBalance === 0 ? 'text-green-700' : 'text-red-600',
                        ]">
                          {{ formatCurrency(recon.actualBalance - recon.expectedBalance) }}
                        </p>
                      </div>
                      <div class="col-span-1 flex flex-col items-center gap-0.5">
                        <CheckCircleIcon v-if="recon.actualBalance - recon.expectedBalance === 0"
                          class="w-5 h-5 text-green-500" />
                        <ExclamationCircleIcon v-else class="w-5 h-5 text-red-500" />
                        <BaseButton variant="outline" size="sm" class="text-[10px] px-1.5 py-0.5 min-h-0 h-auto"
                          @click="toggleMovements(recon.bankId)">
                          {{ movementsBankId === recon.bankId ? 'Ocultar' : 'Ver' }}
                        </BaseButton>
                      </div>
                    </div>
                  </div>

                  <div v-if="movementsBankId != null && expected" class="mt-2">
                    <BankMovementsPanel :key="movementsBankId" :bank-id="movementsBankId"
                      :branch-id="authStore.branchId ?? undefined" embedded lock-date-range
                      :initial-from-date="closureFromYmd" :initial-to-date="closureToYmd" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== BOTÓN GUARDAR ===== -->
          <div class="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end sm:items-center gap-2 pt-1">
            <div v-if="!canSave"
              class="text-xs sm:text-sm text-red-600 flex items-center gap-1 sm:mr-auto sm:w-full sm:max-w-xl">
              <ExclamationCircleIcon class="w-4 h-4 shrink-0" />
              {{ saveBlockReason }}
            </div>
            <div v-if="hasClosureRecordedToday"
              class="flex items-center gap-1.5 text-xs sm:text-sm text-amber-900 max-w-md sm:text-right">
              <InformationCircleIcon class="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>Ya hoy cuadramos la caja.</span>
            </div>
            <BaseButton variant="primary" :disabled="!canSave" :loading="saving" @click="onSaveClosureClick"
              class="px-6 sm:px-8">
              Guardar Cuadre
            </BaseButton>
          </div>
        </div>

      </template>

      <!-- Estado vacío -->
      <div v-else-if="!loading" class="text-center py-16 text-gray-400">
        <BanknotesIcon class="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p>No se pudieron cargar los datos del cuadre.</p>
        <BaseButton variant="outline" class="mt-4" @click="loadData">Reintentar</BaseButton>
      </div>

    </div>

    <CashClosureHistoryModal v-model="showHistoryModal" :branch-id="authStore.branchId" />

    <BaseDialog v-model="vaultAbonoOpen" title="Abonar a caja mayor (efectivo)" size="md"
      @update:model-value="onVaultAbonoToggle">
      <p class="text-sm text-gray-600 mb-3">
        El valor sale del efectivo físico en cajón y suma al saldo esperado de «{{ cashVaultBank?.bankName }}».
      </p>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-500 block mb-1">Monto (COP)</label>
          <input v-model.number="vaultAbonoAmount" type="number" min="1" step="1000"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Nota (opcional)</label>
          <input v-model="vaultAbonoNote" type="text" maxlength="500"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="vaultAbonoOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :loading="savingVaultMovement" @click="submitVaultAbono">Registrar abono
        </BaseButton>
      </template>
    </BaseDialog>

    <BaseDialog v-model="vaultDescargaOpen" title="Descargar desde caja mayor" size="md"
      @update:model-value="onVaultDescargaToggle">
      <p class="text-sm text-gray-600 mb-3">
        El valor vuelve al efectivo en cajón y resta del saldo esperado de «{{ cashVaultBank?.bankName }}».
        Saldo esperado actual:
        <span class="font-semibold tabular-nums">{{ formatCurrency(cashVaultBank?.expectedBalance ?? 0) }}</span>
      </p>
      <div class="space-y-3">
        <label class="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
          <input v-model="vaultDescargaAll" type="checkbox" class="rounded border-gray-300" />
          Descargar todo el saldo (dejar en $0 el esperado de caja mayor)
        </label>
        <div v-if="!vaultDescargaAll">
          <label class="text-xs text-gray-500 block mb-1">Monto (COP)</label>
          <input v-model.number="vaultDescargaAmount" type="number" min="1" step="1000"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </div>
        <div>
          <label class="text-xs text-gray-500 block mb-1">Nota (opcional)</label>
          <input v-model="vaultDescargaNote" type="text" maxlength="500"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="outline" @click="vaultDescargaOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" class="bg-amber-600 hover:bg-amber-700 border-amber-600"
          :loading="savingVaultMovement" @click="submitVaultDescarga">
          Registrar descarga
        </BaseButton>
      </template>
    </BaseDialog>

    <DeliveryAdvanceLoanModal v-model="deliveryAdvanceModalOpen" :branch-id="authStore.branchId"
      @success="onDeliveryAdvanceSuccess" />

    <BaseDialog v-model="deactivateDialogOpen" title="Dar de baja préstamo informal" size="md"
      @update:model-value="onDeactivateDialogToggle">
      <p class="text-sm text-gray-600 mb-3">
        Opcional: nota interna (quién devolvió, acuerdo, etc.).
      </p>
      <textarea v-model="deactivateNotes" rows="3" maxlength="500" placeholder="Nota (opcional)"
        class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
      <template #footer>
        <BaseButton variant="outline" @click="deactivateDialogOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :loading="deactivatingLoan" @click="confirmDeactivateLoan">
          Confirmar baja
        </BaseButton>
      </template>
    </BaseDialog>

    <BaseDialog v-model="secondClosureConfirmOpen" title="Guardar otro cuadre" size="sm">
      <p class="text-sm text-gray-700">Ya tenemos un cuadre guardado del día de hoy.</p>
      <p class="text-sm text-gray-700 mt-3">¿Quieres guardar otro?</p>
      <template #footer>
        <BaseButton variant="outline" @click="secondClosureConfirmOpen = false">Cancelar</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="confirmSecondClosureSave">
          Sí, guardar
        </BaseButton>
      </template>
    </BaseDialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import CashClosureHistoryModal from '@/components/cashRegister/CashClosureHistoryModal.vue'
import DeliveryAdvanceLoanModal from '@/components/cashRegister/DeliveryAdvanceLoanModal.vue'
import BankMovementsPanel from '@/components/payments/banks/BankMovementsPanel.vue'
import { useAuthStore } from '@/store/auth'
import { formatYmdBogota } from '@/utils/colombiaDate'
import { defaultBusinessCalendar } from '@/utils/datetime'
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ChevronDownIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import { cashRegisterApi } from '@/services/MainAPI/cashRegisterApi'
import { useToast } from '@/composables/useToast'
import type { BranchInformalLoan, CashRegisterExpected, CloseBankReconciliationDto } from '@/types/cashRegister'
import { DENOMINATIONS } from '@/types/cashRegister'

const authStore = useAuthStore()
const { success: toastSuccess, error: toastError } = useToast()

const showHistoryModal = ref(false)
const canViewClosureHistory = computed(() => authStore.isAdmin || authStore.isSuperadmin)

function emptyDenominationCounts(): Record<number, number> {
  return Object.fromEntries(DENOMINATIONS.map((d) => [d, 0]))
}

// ===== STATE =====
const loading = ref(false)
const saving = ref(false)
const expected = ref<CashRegisterExpected | null>(null)

const denominationCounts = ref<Record<number, number>>(emptyDenominationCounts())
const closingCash = ref(0)

const loansTab = ref<'active' | 'inactive'>('active')
const loansSectionExpanded = ref(false)
const branchInformalLoans = ref<BranchInformalLoan[]>([])
const informalLoansLoading = ref(false)
const newLoanConcept = ref('')
const newLoanAmount = ref<number>(0)
const savingLoan = ref(false)
const deliveryAdvanceModalOpen = ref(false)
const deactivateDialogOpen = ref(false)
const secondClosureConfirmOpen = ref(false)
const deactivateNotes = ref('')
const loanToDeactivate = ref<BranchInformalLoan | null>(null)
const deactivatingLoan = ref(false)

const vaultAbonoOpen = ref(false)
const vaultDescargaOpen = ref(false)
const vaultAbonoAmount = ref<number>(0)
const vaultAbonoNote = ref('')
const vaultDescargaAmount = ref<number>(0)
const vaultDescargaAll = ref(false)
const vaultDescargaNote = ref('')
const savingVaultMovement = ref(false)

const bankReconciliations = ref<
  Array<CloseBankReconciliationDto & { bankName: string }>
>([])

const movementsBankId = ref<number | null>(null)

function denomsStorageKey(): string {
  return `senor-arroz:cash-register-denoms:${authStore.branchId ?? 0}`
}

/** Identifica el periodo entre el último cuadre y el próximo; si cambia, el borrador guardado no aplica. */
function closureContext(exp: CashRegisterExpected): string {
  return exp.lastClosureAt ?? ''
}

const PERSIST_DENOMS_DEBOUNCE_MS = 250
let persistDenomsTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersistDenominationDraft() {
  if (typeof window === 'undefined') return
  if (persistDenomsTimer !== null) {
    clearTimeout(persistDenomsTimer)
    persistDenomsTimer = null
  }
  persistDenomsTimer = window.setTimeout(() => {
    persistDenomsTimer = null
    persistDenominationDraft()
  }, PERSIST_DENOMS_DEBOUNCE_MS)
}

function cancelPersistDenominationDraftTimer() {
  if (persistDenomsTimer !== null) {
    clearTimeout(persistDenomsTimer)
    persistDenomsTimer = null
  }
}

function flushPersistDenominationDraft() {
  cancelPersistDenominationDraftTimer()
  persistDenominationDraft()
}

function persistDenominationDraft() {
  const exp = expected.value
  if (!exp || typeof localStorage === 'undefined') return
  const counts: Record<string, number> = {}
  for (const d of DENOMINATIONS) {
    counts[String(d)] = denominationCounts.value[d] ?? 0
  }
  try {
    localStorage.setItem(
      denomsStorageKey(),
      JSON.stringify({
        v: 1,
        context: closureContext(exp),
        counts,
      })
    )
  } catch {
    /* quota u otro error: ignorar */
  }
}

/** Restaura conteos desde localStorage; sin datos válidos no modifica el estado actual. */
function hydrateDenominationDraft(exp: CashRegisterExpected) {
  if (typeof localStorage === 'undefined') return
  let raw: string | null
  try {
    raw = localStorage.getItem(denomsStorageKey())
  } catch {
    return
  }
  if (!raw) return

  let parsed: { v?: number; context?: string; counts?: Record<string, number> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    try {
      localStorage.removeItem(denomsStorageKey())
    } catch {
      /* ignore */
    }
    return
  }

  if (!parsed.counts || typeof parsed.counts !== 'object') return

  const next = emptyDenominationCounts()
  for (const d of DENOMINATIONS) {
    const v = parsed.counts[String(d)]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      next[d] = Math.floor(v)
    }
  }
  denominationCounts.value = next
  recalcClosingCash()

  const ctx = closureContext(exp)
  if (parsed.context !== ctx) persistDenominationDraft()
}

function onDenominationInput() {
  recalcClosingCash()
  schedulePersistDenominationDraft()
}

/** Normaliza el valor al salir del campo y guarda de inmediato (evita perder el último debounce). */
function onDenominationBlur(denom: number) {
  const raw = denominationCounts.value[denom]
  const n =
    typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  denominationCounts.value[denom] = n
  recalcClosingCash()
  flushPersistDenominationDraft()
}

// ===== COMPUTED =====
const countedGlobalTotal = computed(() => {
  const e = expected.value
  if (!e) return 0
  const banksSum = bankReconciliations.value.reduce((s, r) => s + (Number(r.actualBalance) || 0), 0)
  const appsPend = Number(e.unsettledAppsTotal ?? 0) || 0
  return closingCash.value + banksSum + appsPend + (e.informalLoansActiveTotal ?? 0)
})

const globalDifference = computed(
  () => countedGlobalTotal.value - (expected.value?.expectedGlobalTotal ?? 0)
)

const globalCuadred = computed(
  () => expected.value != null && globalDifference.value === 0
)

const totalActiveLoans = computed(() =>
  branchInformalLoans.value.reduce((sum, l) => sum + (l.amount || 0), 0)
)

const allBanksCuadred = computed(() =>
  bankReconciliations.value.every((r) => r.actualBalance - r.expectedBalance === 0)
)

const undeliveredCount = computed(() => expected.value?.undeliveredOrdersCount ?? 0)

const canSave = computed(
  () =>
    !saving.value &&
    undeliveredCount.value === 0 &&
    allBanksCuadred.value &&
    globalCuadred.value &&
    bankReconciliations.value.length > 0
)

const cashVaultBank = computed(() => {
  const b = expected.value?.banks.find((x) => x.bankType === 'cash_vault')
  return b ?? null
})

const saveBlockReason = computed(() => {
  const n = undeliveredCount.value
  if (n > 0) {
    return n === 1
      ? 'Hay 1 pedido sin entregar; entrégalo o cancélalo antes de guardar.'
      : `Hay ${n} pedidos sin entregar; entrégalos o cancélalos antes de guardar.`
  }
  if (bankReconciliations.value.length === 0) return 'No hay bancos configurados para esta sucursal.'
  if (!allBanksCuadred.value) return 'Hay bancos con diferencia distinta de $0'
  if (!globalCuadred.value)
    return 'El total global contado (caja + bancos + apps pendientes + préstamos activos) no coincide con el esperado (apertura + ventas − gastos + abonos reserva si aplica).'
  return ''
})

const closureFromYmd = computed(() => {
  if (!expected.value) return ''
  const d = expected.value.lastClosureAt
    ? new Date(expected.value.lastClosureAt)
    : new Date(expected.value.asOf)
  return formatYmdBogota(d)
})

const closureToYmd = computed(() => {
  if (!expected.value) return ''
  return formatYmdBogota(new Date(expected.value.asOf))
})

/** Mismo día calendario (CO) que el snapshot actual: ya hubo un cierre hoy; advertir antes de un segundo guardado. */
const hasClosureRecordedToday = computed(() => {
  const exp = expected.value
  if (!exp?.lastClosureAt) return false
  return formatYmdBogota(new Date(exp.lastClosureAt)) === formatYmdBogota(new Date(exp.asOf))
})

const loansCollapsedSummary = computed(() => {
  if (informalLoansLoading.value) return 'Cargando…'
  const loans = branchInformalLoans.value
  const tab = loansTab.value
  if (!loans.length) return tab === 'active' ? 'Sin activos' : 'Sin inactivos'
  const sum = loans.reduce((s, l) => s + (l.amount || 0), 0)
  const label = tab === 'active' ? 'activos' : 'inactivos'
  return `${loans.length} ${label} · ${formatCurrency(sum)}`
})

// ===== METHODS =====
function toggleMovements(bankId: number) {
  movementsBankId.value = movementsBankId.value === bankId ? null : bankId
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
    value ?? 0
  )
}

function formatDate(iso: string): string {
  return defaultBusinessCalendar.formatDateMediumTime(iso)
}

function recalcClosingCash() {
  closingCash.value = DENOMINATIONS.reduce(
    (sum, d) => sum + d * (denominationCounts.value[d] || 0),
    0
  )
}

async function refreshExpectedPreservingBankActuals() {
  const branchId = authStore.branchId ?? undefined
  const exp = await cashRegisterApi.getExpected(branchId)
  expected.value = exp
  for (const b of exp.banks) {
    const row = bankReconciliations.value.find((r) => r.bankId === b.bankId)
    if (row) row.expectedBalance = b.expectedBalance
  }
}

async function loadBranchInformalLoans() {
  informalLoansLoading.value = true
  try {
    const scope = loansTab.value === 'inactive' ? 'inactive' : 'active'
    branchInformalLoans.value = await cashRegisterApi.getInformalLoans(authStore.branchId ?? undefined, scope)
  } catch (e) {
    console.error('Error cargando préstamos informales:', e)
    branchInformalLoans.value = []
  } finally {
    informalLoansLoading.value = false
  }
}

watch(loansTab, () => {
  void loadBranchInformalLoans()
})

function openDeliveryAdvanceModal() {
  loansSectionExpanded.value = true
  deliveryAdvanceModalOpen.value = true
}

async function onDeliveryAdvanceSuccess() {
  await refreshExpectedPreservingBankActuals()
  await loadBranchInformalLoans()
}

async function submitNewLoan() {
  const c = newLoanConcept.value.trim()
  if (!c) {
    toastError('Concepto obligatorio', 'Escribe un concepto para el préstamo.')
    return
  }
  savingLoan.value = true
  try {
    await cashRegisterApi.createInformalLoan(
      { concept: c, amount: Number(newLoanAmount.value) || 0 },
      authStore.branchId ?? undefined
    )
    newLoanConcept.value = ''
    newLoanAmount.value = 0
    toastSuccess('Préstamo registrado', 4000)
    await refreshExpectedPreservingBankActuals()
    await loadBranchInformalLoans()
  } catch (e: any) {
    toastError('No se pudo registrar', e.message || 'Error')
  } finally {
    savingLoan.value = false
  }
}

function openDeactivateLoan(loan: BranchInformalLoan) {
  loanToDeactivate.value = loan
  deactivateNotes.value = ''
  deactivateDialogOpen.value = true
}

function onDeactivateDialogToggle(open: boolean) {
  if (!open) {
    loanToDeactivate.value = null
    deactivateNotes.value = ''
  }
}

function openVaultAbono() {
  vaultAbonoAmount.value = 0
  vaultAbonoNote.value = ''
  vaultAbonoOpen.value = true
}

function onVaultAbonoToggle(open: boolean) {
  if (!open) {
    vaultAbonoAmount.value = 0
    vaultAbonoNote.value = ''
  }
}

async function submitVaultAbono() {
  const n = Number(vaultAbonoAmount.value)
  if (!Number.isFinite(n) || n <= 0) {
    toastError('Monto inválido', 'Indica un monto mayor a 0.')
    return
  }
  savingVaultMovement.value = true
  try {
    await cashRegisterApi.createCashVaultMovement(
      {
        kind: 'abono_to_vault',
        amount: n,
        note: vaultAbonoNote.value.trim() || undefined,
      },
      authStore.branchId ?? undefined
    )
    vaultAbonoOpen.value = false
    toastSuccess('Abono registrado', 4000)
    await refreshExpectedPreservingBankActuals()
  } catch (e: any) {
    toastError('No se pudo registrar', e.message || 'Error')
  } finally {
    savingVaultMovement.value = false
  }
}

function openVaultDescarga() {
  vaultDescargaAmount.value = 0
  vaultDescargaAll.value = false
  vaultDescargaNote.value = ''
  vaultDescargaOpen.value = true
}

function onVaultDescargaToggle(open: boolean) {
  if (!open) {
    vaultDescargaAmount.value = 0
    vaultDescargaAll.value = false
    vaultDescargaNote.value = ''
  }
}

async function submitVaultDescarga() {
  const all = vaultDescargaAll.value
  const n = Number(vaultDescargaAmount.value)
  if (!all && (!Number.isFinite(n) || n <= 0)) {
    toastError('Monto inválido', 'Indica un monto o marca «descargar todo».')
    return
  }
  savingVaultMovement.value = true
  try {
    await cashRegisterApi.createCashVaultMovement(
      {
        kind: 'withdraw_from_vault',
        amount: all ? undefined : n,
        withdrawAll: all,
        note: vaultDescargaNote.value.trim() || undefined,
      },
      authStore.branchId ?? undefined
    )
    vaultDescargaOpen.value = false
    toastSuccess('Descarga registrada', 4000)
    await refreshExpectedPreservingBankActuals()
  } catch (e: any) {
    toastError('No se pudo registrar', e.message || 'Error')
  } finally {
    savingVaultMovement.value = false
  }
}

async function confirmDeactivateLoan() {
  const loan = loanToDeactivate.value
  if (!loan) return
  deactivatingLoan.value = true
  try {
    await cashRegisterApi.deactivateInformalLoan(
      loan.id,
      { notes: deactivateNotes.value.trim() || undefined },
      authStore.branchId ?? undefined
    )
    deactivateDialogOpen.value = false
    loanToDeactivate.value = null
    toastSuccess('Préstamo dado de baja', 4000)
    await refreshExpectedPreservingBankActuals()
    await loadBranchInformalLoans()
  } catch (e: any) {
    toastError('No se pudo dar de baja', e.message || 'Error')
  } finally {
    deactivatingLoan.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const branchId = authStore.branchId ?? undefined
    expected.value = await cashRegisterApi.getExpected(branchId)
    movementsBankId.value = null

    // Inicializar conciliaciones con valores del sistema
    bankReconciliations.value = expected.value.banks.map((b) => ({
      bankId: b.bankId,
      bankName: b.bankName,
      expectedBalance: b.expectedBalance,
      actualBalance: b.expectedBalance, // Por defecto asumimos que cuadra
      adjustments: '[]',
    }))

    hydrateDenominationDraft(expected.value)
    await loadBranchInformalLoans()
  } catch (e: any) {
    console.error('Error cargando datos del cuadre:', e)
  } finally {
    loading.value = false
  }
}

function onSaveClosureClick() {
  if (!canSave.value || !expected.value) return
  if (hasClosureRecordedToday.value) {
    secondClosureConfirmOpen.value = true
    return
  }
  void saveClosure()
}

async function confirmSecondClosureSave() {
  secondClosureConfirmOpen.value = false
  if (!canSave.value || !expected.value) return
  await saveClosure()
}

async function saveClosure() {
  if (!canSave.value || !expected.value) return
  cancelPersistDenominationDraftTimer()
  saving.value = true
  try {
    const dto = {
      closedAt: new Date().toISOString(),
      denominationCounts: JSON.stringify(
        Object.fromEntries(
          DENOMINATIONS.filter((d) => (denominationCounts.value[d] || 0) > 0).map((d) => [
            d,
            denominationCounts.value[d],
          ])
        )
      ),
      closingCash: closingCash.value,
      bankReconciliations: bankReconciliations.value.map(({ bankId, expectedBalance, actualBalance, adjustments }) => ({
        bankId,
        expectedBalance,
        actualBalance,
        adjustments,
      })),
    }

    await cashRegisterApi.closeCashRegister(dto, authStore.branchId ?? undefined)
    toastSuccess('Cuadre guardado', 5000)
    await loadData()
  } catch (e: any) {
    toastError('No se pudo guardar el cuadre', e.message || 'Error desconocido')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadData()
})

onBeforeUnmount(() => {
  flushPersistDenominationDraft()
})
</script>
