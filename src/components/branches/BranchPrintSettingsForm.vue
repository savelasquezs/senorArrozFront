<template>
    <div class="space-y-6">
        <BaseAlert v-if="!initial" variant="info" class="text-sm">
            No hay datos de impresión cargados. Guarda la sucursal desde el servidor o recarga la página.
        </BaseAlert>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput v-model="form.printerQueueKitchen" label="Cola Windows — Cocina"
                placeholder="Exactamente como en Panel de impresión" :maxlength="128" />
            <BaseInput v-model="form.printerQueueDelivery" label="Cola Windows — Domicilio" :maxlength="128" />
            <BaseInput v-model="form.printerQueueCashier" label="Cola Windows — Caja (opcional)" :maxlength="128" />
        </div>

        <p class="text-xs text-gray-500">
            El agente en cada PC usa estos nombres si están configurados aquí; si un campo queda vacío, el agente puede usar su archivo local como respaldo.
        </p>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Tipos de trabajo</p>
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableKitchenJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar comandas de cocina
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableDeliveryJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar tickets de domicilio
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.enableCashierJobs" type="checkbox" class="rounded border-gray-300" />
                    Encolar tickets de caja
                </label>
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Cabecera cocina (opcional)</p>
            <BaseInput v-model="form.kitchenHeaderLine1" label="Línea 1" :maxlength="80" />
            <BaseInput v-model="form.kitchenHeaderLine2" label="Línea 2" :maxlength="80" />
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenOrderNumber" type="checkbox" class="rounded border-gray-300" />
                    Mostrar número de pedido
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenTime" type="checkbox" class="rounded border-gray-300" />
                    Mostrar hora en cocina
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.showKitchenNotes" type="checkbox" class="rounded border-gray-300" />
                    Mostrar notas de línea
                </label>
            </div>
        </div>

        <div class="border-t border-gray-200 pt-4 space-y-3">
            <p class="text-sm font-medium text-gray-900">Ticket domicilio / caja</p>
            <div class="flex flex-col gap-2">
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowLineSubtotals" type="checkbox" class="rounded border-gray-300" />
                    Subtotales por línea
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowPayments" type="checkbox" class="rounded border-gray-300" />
                    Pagos en el ticket
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.deliveryShowLoyaltyFooter" type="checkbox" class="rounded border-gray-300" />
                    Pie de promoción / lealtad
                </label>
                <label class="inline-flex items-center gap-2 text-sm">
                    <input v-model="form.cashierMirrorDeliveryLayout" type="checkbox" class="rounded border-gray-300" />
                    Caja usa plantilla similar a domicilio
                </label>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BaseInput v-model="form.footerMessageKitchen" label="Pie cocina" :maxlength="200" />
            <BaseInput v-model="form.footerMessageDelivery" label="Pie domicilio" :maxlength="200" />
            <BaseInput v-model="form.footerMessageCashier" label="Pie caja" :maxlength="200" />
        </div>

        <div class="max-w-xs">
            <BaseInput v-model.number="form.paperWidthMm" label="Ancho papel (mm)" type="number" min="40" max="120" />
        </div>

        <div class="border-t border-gray-200 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="text-sm">
                <p class="font-medium text-gray-900">Token del agente local</p>
                <p class="text-gray-600">
                    Estado:
                    <span :class="initial?.agentTokenConfigured ? 'text-green-700' : 'text-amber-700'">
                        {{ initial?.agentTokenConfigured ? 'Configurado' : 'Sin configurar' }}
                    </span>
                    <span v-if="initial?.agentTokenUpdatedAt" class="text-gray-500">
                        · Última rotación: {{ formatDt(initial.agentTokenUpdatedAt) }}
                    </span>
                </p>
            </div>
            <BaseButton type="button" variant="outline" size="sm" :loading="rotating" @click="openTokenDialog">
                Regenerar token
            </BaseButton>
        </div>

        <div class="flex justify-end pt-2">
            <BaseButton type="button" variant="primary" :loading="saving" @click="submit">
                Guardar impresión
            </BaseButton>
        </div>

        <BaseDialog v-model="showTokenModal @update:modelValue=onTokenModalClose" title="Nuevo token del agente">
            <div class="space-y-3 text-sm">
                <BaseAlert variant="warn\> ??">

                </BaseAlert>
            </div>
        </BaseDialog>
    </div>
</template>
