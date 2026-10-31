<template>
	<div :key="detailReload" class="order-detail space-y-3 text-gray-900" v-if="order">
        <div v-if="isRemoteOrder" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Pedido tomado desde esta sede · prepara y despacha <strong>{{ order.branchName }}</strong>.
            Los pagos ya registrados conservan sus bancos y aplicaciones originales.
        </div>
        <div v-if="staleSnapshot" role="status" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Este pedido cambió desde que lo abriste. Tus cambios sin guardar se conservan hasta que decidas actualizar.
            <BaseButton size="sm" variant="outline" :loading="refreshingOrder" @click="reloadOrder">Descartar cambios y actualizar</BaseButton>
        </div>
        <p v-if="optionsLoading" class="text-sm text-gray-500">Cargando opciones de {{ order.branchName }}…</p>
        <div v-if="operationOptionsError" role="alert" class="text-sm text-red-700">
            {{ operationOptionsError }}
            <BaseButton size="sm" variant="ghost" @click="loadOperationOptions">Reintentar</BaseButton>
        </div>
        <OrderTrackingDialog v-if="showTracking" v-model="showTracking" :order="order" />

		<div v-if="order.inventoryIssue" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
			Alerta de inventario: {{ order.inventoryIssue }}
		</div>
        <section aria-label="Resumen del pedido" class="rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 class="text-xl font-bold">#{{ order.id }}</h1>
                    <OrderSourceBadge :source="order.orderSource" />
                    <OrderTypeBadge :type="order.type" :display-name="order.typeDisplayName" />
                    <span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">{{ getOrderStatusDisplayName(order.status) }}</span>
                    <span class="text-sm text-gray-600">{{ order.branchName }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1">
				<BaseButton
					v-if="!isDeliveryman"
					variant="secondary"
					size="sm"

					@click="$router.push({ name: 'OrdersList', query: orderReturnQuery })"
				>
					<ArrowLeftIcon class="w-4 h-4 mr-1" />
					Volver
				</BaseButton>
				<div v-if="permissions.canReprintThermalTickets() && order" role="group" aria-label="Impresión"
                    class="flex flex-wrap gap-1">
					<BaseButton
						variant="outline"
						size="sm"

						:loading="reprintKitchenLoading"
						title="Reimprimir comanda de cocina"
						@click="onReprintKitchen"
					>
						<PrinterIcon class="w-4 h-4 mr-1" />
						Comanda cocina
					</BaseButton>
					<BaseButton
						variant="outline"
						size="sm"

						:loading="reprintDeliveryLoading"
						title="Reimprimir ticket de domicilio"
						@click="onReprintDelivery"
					>
						<PrinterIcon class="w-4 h-4 mr-1" />
						Ticket domicilio
					</BaseButton>
				</div>
                <details v-if="permissions.canCancel(order) || canTransferBranch || canManageInvoices || canViewTracking" class="relative">
                    <summary class="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Más acciones</summary>
                    <div class="absolute right-0 z-20 mt-1 flex flex-col items-stretch whitespace-nowrap rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                        <button v-if="canViewTracking" type="button" @click="showTracking = true"
                            class="flex w-full items-center justify-end gap-3 rounded-lg px-3 py-2 text-right text-sm font-normal text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:outline-emerald-600">
                            <span>Ver ubicación</span><MapPinIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
                        </button>
                        <OrderElectronicInvoicing v-if="canManageInvoices" :order-id="order.id" :customer-id="order.customerId" :status="order.status" :order="order" :stale="staleSnapshot" />
                        <button v-if="canTransferBranch" type="button" @click="showTransferBranchDialog = true"
                            class="flex w-full items-center justify-end gap-3 rounded-lg px-3 py-2 text-right text-sm font-normal text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:outline-emerald-600">
                            <span>Cambiar sucursal</span><span class="w-4 shrink-0" aria-hidden="true"></span>
                        </button>
                        <button v-if="permissions.canCancel(order)" type="button" @click="showCancelModal = true"
                            class="flex w-full items-center justify-end gap-3 rounded-lg px-3 py-2 text-right text-sm font-normal text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:bg-gray-100 focus-visible:outline-emerald-600">
                            <span>Cancelar pedido</span><XCircleIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
                        </button>
                    </div>
                </details>
				<BaseButton
					v-if="permissions.canUncancel(order)"
					variant="primary"
					size="sm"
					class="w-full sm:w-auto"
					@click="showUncancelConfirm = true"
				>
					<CheckCircleIcon class="w-4 h-4 mr-1" />
					Descancelar
				</BaseButton>
                </div>
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Creado {{ formatDateTime(order.createdAt) }}</span>
                <span v-if="order.takenByName">Tomado por {{ order.takenByName }}</span>
            </div>
        </section>

		<div
			v-if="order.status === 'cancelled' && order.cancelledReason"
			class="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
		>
			<p class="text-sm font-semibold text-red-800">Motivo de cancelación</p>
			<p class="mt-1 text-sm text-red-700">{{ order.cancelledReason }}</p>
		</div>

        <details v-if="!isDeliveryman" class="rounded-xl border border-gray-200 bg-white px-3 py-2 sm:px-4" :open="!['delivered', 'cancelled'].includes(order.status)">
            <summary class="cursor-pointer text-sm font-medium">Seguimiento · {{ getOrderStatusDisplayName(order.status) }}</summary>
            <OrderProgressBar class="mt-2" compact :current-status="order.status" :status-times="order.statusTimes"
                :order-type="order.type" :prepare-at="order.prepareAt" :clickable="order.status !== 'cancelled' || canSelectAnyOrderStatus"
                @status-click="handleStatusChange" />
        </details>
        <nav aria-label="Secciones del pedido" class="flex gap-1 lg:hidden">
            <a v-for="section in detailSections" :key="section.id" :href="`#${detailId}-${section.id}`"
                @click="section.id === 'payments' && scrollToPaymentsTab()"
                class="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm text-emerald-700">{{ section.name }}</a>
        </nav>
        <div class="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <section :id="`${detailId}-info`" aria-label="Información del pedido" tabindex="-1" class="order-info min-w-0 scroll-mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                <h2 class="text-sm font-semibold">Cliente y entrega</h2>
					<div
						v-if="order.externalFulfillmentProvider === 'rappi'"
						class="rounded-lg border border-orange-200 bg-orange-50 p-4"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p class="font-semibold text-orange-900">Pedido Rappi #{{ order.externalOrderId }}</p>
								<p class="text-sm text-orange-800">{{ order.externalStoreName || 'Tienda Rappi' }}</p>
							</div>
							<p class="text-xs text-orange-700">Productos, cliente y pagos se administran desde la integración.</p>
						</div>
						<div class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
							<p>Descuentos: <strong>{{ formatCurrency(order.externalTotalDiscounts || 0) }}</strong></p>
							<p>Asume Rappi: <strong>{{ formatCurrency(order.externalDiscountByRappi || 0) }}</strong></p>
							<p>Asume Señor Arroz: <strong>{{ formatCurrency(order.externalDiscountByPartner || 0) }}</strong></p>
							<p>Cargos: <strong>{{ formatCurrency(order.externalCharges || 0) }}</strong></p>
						</div>
					</div>
					<div class="order-info-grid grid grid-cols-1 gap-3">
						<!-- Cliente -->
						<div class="space-y-2">
							<label class="text-xs sm:text-sm font-medium text-gray-700"
								>Cliente</label
							>
							<div class="flex flex-col gap-2 bg-gray-50 rounded-lg p-2 sm:p-3">
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<p class="text-xs sm:text-sm font-medium text-gray-900">
											{{
												order.customerName || order.guestName || 'Sin cliente'
											}}
										</p>
									</div>
									<BaseButton
										v-if="permissions.canEditOrder(order)"
										size="sm"
										variant="ghost"
										aria-label="Editar cliente del pedido"
										@click="showEditCustomerModal = true"
									>
										<PencilIcon class="w-4 h-4" />
									</BaseButton>
								</div>

								<!-- Teléfonos del cliente -->
								<div v-if="order.externalCustomerPhone" class="mt-2">
									<PhoneNumberItem :phone-number="order.externalCustomerPhone" />
								</div>
								<div v-else-if="order.customerId && customer" class="space-y-1 mt-2">
									<p v-if="customer.whatsAppUsername" class="text-sm font-medium text-emerald-700">{{ customer.whatsAppUsername }}</p>
									<PhoneNumberItem v-if="customer.phone1" :phone-number="customer.phone1" />
									<PhoneNumberItem
										v-if="customer.phone2"
										:phone-number="customer.phone2"
									/>
								</div>
								<!-- Fallback: mostrar customerPhone si no hay cliente cargado -->
								<div v-else-if="order.customerPhone" class="mt-2">
									<PhoneNumberItem :phone-number="order.customerPhone" />
								</div>
								<!-- Loading state -->
								<div
									v-if="order.customerId && customerLoading"
									class="mt-2 flex items-center gap-2 text-xs text-gray-500"
								>
									<BaseLoading size="sm" />
									<span>Cargando teléfonos...</span>
								</div>
								<!-- Error state -->
								<div
									v-if="order.customerId && customerError"
									class="mt-2 text-xs text-red-500"
								>
									{{ customerError }}
								</div>
							</div>
						</div>

						<!-- Guest Name -->
						<div class="space-y-2">
							<BaseInput
								label="Nombre de quien recibe"
								v-model="editableGuestName"
								placeholder="Nombre de quien recibe"
								:disabled="!permissions.canEditOrder(order)"
								@blur="updateGuestName"
							/>
						</div>

						<!-- Tipo de pedido - CLICKEABLE -->
						<div class="space-y-2">
							<label class="text-xs sm:text-sm font-medium text-gray-700"
								>Tipo de pedido</label
							>
							<button
								v-if="permissions.canEditOrder(order)"
								@click="showEditOrderTypeModal = true"
								class="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors cursor-pointer"
							>
								<OrderTypeBadge
									:type="order.type"
									:display-name="order.typeDisplayName"
								/>
								<PencilIcon class="w-4 h-4 text-gray-400" />
							</button>
							<div v-else class="bg-gray-50 rounded-lg p-3">
								<OrderTypeBadge
									:type="order.type"
									:display-name="order.typeDisplayName"
								/>
							</div>
						</div>

						<!-- Dirección - SOLO SI DELIVERY O RESERVATION -->
						<div
							v-if="order.type === 'delivery' || order.type === 'reservation'"
							class="space-y-2"
						>
							<label class="text-xs sm:text-sm font-medium text-gray-700"
								>Dirección de entrega</label
							>
							<div
								class="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3 gap-2"
							>
								<div class="min-w-0 flex-1">
									<p class="text-xs sm:text-sm text-gray-900">
										{{ order.externalDeliveryAddress || order.addressDescription || 'Sin dirección' }}
									</p>
									<p
										v-if="order.addressAdditionalInfo"
										class="mt-1 text-xs text-gray-600"
									>
										{{ order.addressAdditionalInfo }}
									</p>
								</div>
								<BaseButton
									v-if="permissions.canEditOrder(order)"
									size="sm"
									variant="ghost"
									aria-label="Editar dirección de entrega"
									@click="showEditCustomerModal = true"
								>
									<PencilIcon class="w-4 h-4" />
								</BaseButton>
							</div>
						</div>

						<!-- Domiciliario: delivery y onsite (onsite puede llevarlo un domiciliario asignado desde caja) -->
						<div
							v-if="order.type === 'delivery' || order.type === 'onsite'"
							class="space-y-2"
						>
							<label class="text-xs sm:text-sm font-medium text-gray-700"
								>Domiciliario</label
							>
							<div
								class="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3"
							>
								<p class="text-xs sm:text-sm text-gray-900">
									{{ order.deliveryManName || 'Sin asignar' }}
								</p>
								<BaseButton
									v-if="!isDeliveryman"
									size="sm"
									variant="ghost"
									@click="showAssignDeliveryModal = true"
								>
									<PencilIcon class="w-4 h-4" />
								</BaseButton>
							</div>
						</div>

					</div>
                <section v-if="showScheduleEditor || order.reservedFor || order.prepareAt" aria-label="Programación y atención" class="space-y-2 border-t border-gray-100 pt-3">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-sm font-semibold">Programación</h3>
                        <BaseButton v-if="showScheduleEditor" size="sm" variant="ghost" aria-label="Editar horarios del pedido"
                            title="Editar horarios" :disabled="staleSnapshot" @click="openDetailEditor('schedule')">
                            <PencilIcon class="h-4 w-4" />
                        </BaseButton>
                    </div>
                    <dl class="space-y-2 text-sm">
                        <div v-if="order.prepareAt"><dt class="text-xs text-gray-500">Preparar</dt><dd>{{ formatDateTime(order.prepareAt) }}</dd></div>
                        <div v-if="order.reservedFor"><dt class="text-xs text-gray-500">Tener listo / entregar</dt><dd class="font-medium">{{ formatDateTime(order.reservedFor) }}</dd></div>
                    </dl>
                </section>
					<!-- Notas -->
					<div class="space-y-2 border-t border-gray-100 pt-3">
                        <div class="flex items-center justify-between gap-2">
                            <h3 class="text-sm font-semibold text-gray-700">Notas del pedido</h3>
                            <BaseButton v-if="permissions.canEditOrder(order)" size="sm" variant="ghost"
                                aria-label="Editar notas del pedido" title="Editar notas" :disabled="staleSnapshot"
                                @click="openDetailEditor('notes')">
                                <PencilIcon class="h-4 w-4" />
                            </BaseButton>
                        </div>
                        <p v-if="order.notes" class="whitespace-pre-wrap break-words text-sm">{{ order.notes }}</p>
                        <p v-else class="text-sm text-gray-400">Sin notas</p>
					</div>
            </section>
            <div class="min-w-0 space-y-3">
                <section :id="`${detailId}-products`" aria-label="Productos del pedido" tabindex="-1" class="min-w-0 scroll-mt-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
					<OrderDetailProductsList
						v-if="order"
						:products="order?.orderDetails"
						:branch-id="order.branchId"
						:delivery-fee="order?.deliveryFee ?? 0"
						:order-type="order?.type"
						:address-id="order?.addressId ?? null"
						:max-free-delivery-discount="maxFreeDeliveryDiscount"
						:free-delivery-requested="order?.freeDeliveryRequested === true"
						:show-delivery-fee-line="hasOrderDelivery(order)"
						:can-edit="!staleSnapshot && permissions.canEditProducts(order) && !!operationOptions && !optionsLoading && !savingDeliveryFee"
						:saving="savingProducts"
                        :save-product-note="saveProductNote"
						@save="handleProductsUpdate"
						@request-cancel-order="handleRequestCancelOrderFromProducts"
						@editing-change="editingProducts = $event"
					>
						<template #delivery-fee="{ editingProducts }">
							<OrderDeliveryFeeEditor :key="order.id" :delivery-fee="order.deliveryFee ?? 0" :total="order.total"
								:can-edit="permissions.canEditDeliveryFee(order)" :saving="savingDeliveryFee"
								:disabled="staleSnapshot || editingProducts || savingProducts" :error="deliveryFeeSaveError"
								@edit="deliveryFeeSaveError = ''" @save="updateDeliveryFee" />
						</template>
					</OrderDetailProductsList>
                </section>
                <details class="rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2">
                    <summary class="cursor-pointer text-sm"><span class="font-medium">Beneficio</span> · {{ appliedBenefitLabel || 'Sin beneficio aplicado' }}<span v-if="permissions.canEditOrder(order)" class="ml-2 text-xs text-emerald-700">Gestionar</span></summary>
                    <p v-if="order.appliedBenefitCode" class="mt-2 text-xs">Código: {{ order.appliedBenefitCode }}</p>
							<div v-if="permissions.canEditOrder(order)" class="mt-3 space-y-2">
								<div class="flex gap-2">
									<BaseInput
										:model-value="detailDiscountCodeInput"
										placeholder="Codigo promocional"
										class="flex-1"
										@update:model-value="updateDetailDiscountCodeInput"
										@keyup.enter="applyDiscountCodeToDetail"
									/>
									<BaseButton
										variant="primary"
										size="sm"
										:loading="savingBenefit"
										:disabled="!detailDiscountCodeInput.trim() || savingBenefit"
										@click="applyDiscountCodeToDetail"
									>
										Aplicar
									</BaseButton>
								</div>
								<div class="flex items-center justify-between gap-3">
									<p v-if="detailBenefitError" class="text-xs text-red-600">{{ detailBenefitError }}</p>
									<p v-else class="text-xs text-emerald-700">Solo puede quedar un beneficio por pedido.</p>
									<BaseButton
										v-if="order.appliedBenefitType && order.appliedBenefitType !== 'None'"
										variant="outline"
										size="sm"
										:disabled="savingBenefit"
										@click="clearDetailBenefit"
									>
										Quitar beneficio
									</BaseButton>
								</div>
								<div v-if="canGrantManualBenefit" class="space-y-2 border-t border-emerald-200 pt-2">
									<BaseInput v-model="detailManualBenefitReason" placeholder="Motivo obligatorio del regalo" />
									<select v-model.number="detailManualGiftProductId" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
										<option :value="null">Producto de la categoría Regalos</option>
										<option v-for="product in detailGiftProducts" :key="product.id" :value="product.id">{{ product.name }}</option>
									</select>
									<div class="flex gap-2">
										<BaseButton size="sm" variant="outline" :disabled="savingBenefit || !detailManualBenefitReason.trim() || !detailManualGiftProductId" @click="applyManualGiftToDetail">Regalar producto</BaseButton>
										<BaseButton v-if="canGiftDetailDelivery" size="sm" variant="outline" :disabled="savingBenefit || !detailManualBenefitReason.trim()" @click="applyManualDeliveryToDetail">Regalar domicilio</BaseButton>
									</div>
								</div>
								<div v-if="order.appliedBenefitType === 'Manual'" class="text-xs text-emerald-800">
									<p>Motivo: {{ order.manualBenefitReason }}</p>
									<p v-if="order.manualBenefitGrantedByUserName">Otorgado por {{ order.manualBenefitGrantedByUserName }}<span v-if="order.manualBenefitGrantedAt"> · {{ formatDateTime(order.manualBenefitGrantedAt) }}</span></p>
								</div>
							</div>
                </details>

                <section :id="`${detailId}-payments`" ref="paymentsSectionRef" aria-label="Pagos del pedido" tabindex="-1" class="min-w-0 scroll-mt-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                    <details ref="paymentsDetailsRef" class="group">
                        <summary class="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm font-semibold">
                            <span class="text-xs transition-transform group-open:rotate-90" aria-hidden="true">▶</span>
                            <h2>Pagos y saldo por cobrar</h2>
                            <span class="ml-auto text-emerald-700 group-open:hidden">Por cobrar: {{ formatCurrency(cashAmount) }}</span>
                        </summary>
                        <div class="mt-3">
						<PaidInStoreCashPanel
							v-if="showPaidInStoreDetailPanel"
							:input-id="'paid-in-store-' + order.id"
							:paid-in-store-cash="order.paidInStoreCash === true"
							:paid-in-store-cash-amount="order.paidInStoreCashAmount ?? null"
							:max-paid-in-store-amount="paidInStoreCap"
							:editable="permissions.canEditPayments(order)"
							:disabled="savingPaidInStore"
							density="compact"
							extra-class="mb-3"
							:helper-text="hasOrderDelivery(order) ? 'El saldo restante se cobra en la entrega.' : 'Efectivo registrado en caja.'"
							@update:paid-in-store-cash="onPaidInStoreChange"
							@edit-paid-in-store-cash="openEditPaidInStoreDetail"
							@remove-paid-in-store-cash="openRemovePaidInStoreDetail"
						/>
						<PersistedPaymentSelector
							v-if="order"
							:order="order"
							:bank-options="bankOptions"
							:app-options="appOptions"
                                compact
							@updated="handlePaymentUpdated"
						/>
                        </div>
                    </details>
                </section>

            </div>
        </div>

		<!-- Sección de entrega para domiciliarios -->
		<div
			v-if="isDeliveryman && order && order.status === 'on_the_way'"
			class="sticky bottom-0 bg-white border-t-2 border-emerald-500 shadow-lg p-4 md:p-6 mt-4 md:mt-6 z-10"
		>
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
				<!-- Valor a cobrar -->
				<div class="flex-1 text-center sm:text-left w-full sm:w-auto">
					<p class="text-xs sm:text-sm text-gray-600 mb-1">Valor a cobrar</p>
					<p
						class="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600"
					>
						{{ formatCurrency(cashAmount) }}
					</p>
				</div>

				<!-- Botón entregar -->
				<BaseButton
					variant="success"
					size="lg"
					class="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold"
					@click="handleDeliverOrder"
				>
					<CheckCircleIcon class="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
					Entregar Pedido
				</BaseButton>
			</div>
		</div>
	</div>

	<!-- Modales -->
    <TransferOrderBranchDialog
        v-if="showTransferBranchDialog && order"
        :open="showTransferBranchDialog"
        :order="order"
        @close="showTransferBranchDialog = false"
        @transferred="handleBranchTransferred"
    />
	<EditCustomerModal
		v-if="showEditCustomerModal && order"
		:open="showEditCustomerModal"
		:order="order"
		:delete-reservation-associated-payments-confirmed="
			pendingDeleteReservationAssociations
		"
		@close="handleCustomerModalClose"
		@updated="(o, snap) => handleCustomerUpdated(o, snap)"
	/>

	<AssignDeliveryModal
		v-if="showAssignDeliveryModal && order"
		:open="showAssignDeliveryModal"
		:order="order"
		:pending-status-change="pendingStatusChange || undefined"
		@close="handleAssignDeliveryModalClose"
		@updated="handleDeliverymanUpdated"
	/>

	<CancelOrderModal
		v-if="showCancelModal && order"
		:open="showCancelModal"
		:order="order"
		@close="showCancelModal = false"
		@cancelled="handleOrderCancelled"
	/>

	<!-- Modal de cambio de tipo -->
	<EditOrderTypeModal
		v-if="showEditOrderTypeModal && order"
		:open="showEditOrderTypeModal"
		:order="order"
		@close="showEditOrderTypeModal = false"
		@updated="(o, snap) => handleOrderTypeUpdated(o, snap)"
		@type-changed-pending="handleTypePendingChange"
		@reservation-associated-delete-confirmed="
			handleReservationAssociatedDeleteConfirmed
		"
		@open-customer-modal="handleOpenCustomerModalFromType"
	/>

	<OrderBankPaymentSyncDialog
		:open="showBankSyncDialog"
		:prompt="bankSyncPrompt"
		:adjusting="bankSyncAdjusting"
		@close="showBankSyncDialog = false"
		@confirm-adjust="onConfirmBankPaymentAdjust"
		@go-to-payments="scrollToPaymentsTab"
	/>

    <OrderNoteDialog :model-value="detailEditor === 'notes'" :notes="order?.notes" title="Notas del pedido"
        label="Indicaciones para preparar o entregar este pedido" :disabled="staleSnapshot || !order || !permissions.canEditOrder(order)"
        :save="updateNotes" @update:model-value="value => { if (!value) detailEditor = null }" />
    <BaseDialog :model-value="detailEditor === 'schedule'" title="Programación del pedido" size="2xl"
        :dismissible="!savingSchedule && !savingPrepareNow" :close-on-backdrop="false"
        @update:model-value="value => { if (!value) detailEditor = null }">
        <OrderScheduleFields v-if="detailEditor === 'schedule'" :prepare-at="editablePrepareAtDate" :reserved-for="editableReservedForDate"
            :disabled="savingSchedule || savingPrepareNow || staleSnapshot" @change="updateEditableSchedule" />
        <p v-if="staleSnapshot" role="alert" class="mt-3 text-sm text-amber-800">El pedido cambió. Cierra este editor y actualiza el pedido antes de guardar.</p>
        <p v-if="editorSaveError" role="alert" class="mt-3 text-sm text-red-600">{{ editorSaveError }}</p>
        <template #footer>
            <BaseButton variant="secondary" :disabled="savingSchedule || savingPrepareNow" @click="detailEditor = null">Cancelar</BaseButton>
            <BaseButton v-if="showPrepareNowButton" variant="outline" :loading="savingPrepareNow"
                :disabled="savingSchedule || staleSnapshot" @click="onPrepareNowClick">Preparar ya</BaseButton>
            <BaseButton variant="primary" :loading="savingSchedule"
                :disabled="savingPrepareNow || staleSnapshot" @click="saveSchedule">Guardar horarios</BaseButton>
        </template>
    </BaseDialog>
	<BaseDialog
		v-model="showKitchenScheduleConfirm"
		title="Pedido en cocina"
		size="md"
	>
		<p class="text-sm text-gray-700">
			Este pedido está en cocina (tomado o en preparación). Al guardar los
			horarios puede salir de la cola de cocina y se avisará por notificación.
			¿Continuar?
		</p>
		<template #footer>
			<BaseButton
				variant="secondary"
				@click="showKitchenScheduleConfirm = false"
				>Cancelar</BaseButton
			>
			<BaseButton
				variant="primary"
				:loading="savingSchedule"
				@click="confirmKitchenScheduleSave"
				>Continuar</BaseButton
			>
		</template>
	</BaseDialog>

	<BaseDialog v-model="showPrepareNowConfirm" title="Preparar ya" size="md">
		<p class="text-sm text-gray-700 space-y-2">
			<span class="block">
				Se fijará la hora de preparación a <strong>ahora</strong> y el pedido
				pasará a <strong>{{ prepareNowTargetTypeLabel }}</strong
				>.
			</span>
			<span v-if="order?.addressId" class="block text-xs text-gray-600">
				Hay dirección: quedará como domicilio.
			</span>
			<span v-else class="block text-xs text-gray-600">
				Sin dirección: quedará como en el local (se quitará dirección de
				entrega).
			</span>
			<span
				v-if="
					order &&
					(order.status === 'taken' || order.status === 'in_preparation')
				"
				class="block text-amber-800 text-xs"
			>
				Está en cocina: puede salir de la lista y se notificará.
			</span>
		</p>
		<template #footer>
			<BaseButton variant="secondary" @click="showPrepareNowConfirm = false"
				>Cancelar</BaseButton
			>
			<BaseButton
				variant="primary"
				:loading="savingPrepareNow"
				@click="executePrepareNow"
				>Confirmar</BaseButton
			>
		</template>
	</BaseDialog>

	<BaseDialog v-model="showUncancelConfirm" title="Descancelar pedido" size="sm">
		<div v-if="order" class="space-y-3 text-sm text-gray-600">
			<p>
				Descancelar el pedido
				<span class="font-medium text-gray-900">#{{ order.id }}</span>
				y dejarlo como <span class="font-medium text-gray-900">Listo</span>?
			</p>
			<p class="text-amber-700">
				Los pagos, abonos y rutas eliminados al cancelar no se restauran automaticamente.
			</p>
		</div>
		<template #footer>
			<BaseButton
				variant="secondary"
				:disabled="uncancelLoading"
				@click="showUncancelConfirm = false"
			>
				Cancelar
			</BaseButton>
			<BaseButton
				variant="primary"
				:loading="uncancelLoading"
				@click="confirmUncancelOrder"
			>
				Descancelar
			</BaseButton>
		</template>
	</BaseDialog>

	<BaseDialog
		v-model="showRemovePaidInStoreDetailDialog"
		title="Quitar cobro en tienda"
		size="sm"
	>
		<p v-if="order" class="text-sm text-gray-600">
			Se quitará el registro de efectivo cobrado en sucursal (<span
				class="font-medium tabular-nums"
				>{{ formatCurrency(paidInStoreDisplayAmountDetail) }}</span
			>).
		</p>
		<template #footer>
			<BaseButton
				variant="secondary"
				:disabled="removePaidInStoreDetailLoading"
				@click="showRemovePaidInStoreDetailDialog = false"
			>
				Cancelar
			</BaseButton>
			<BaseButton
				variant="primary"
				class="bg-red-600 hover:bg-red-700"
				:loading="removePaidInStoreDetailLoading"
				@click="confirmRemovePaidInStoreDetail"
			>
				Quitar
			</BaseButton>
		</template>
	</BaseDialog>

	<BaseDialog
		v-model="showEditPaidInStoreDetailDialog"
		title="Editar monto — efectivo en tienda"
		size="sm"
	>
		<div v-if="order" class="space-y-3">
			<p class="text-sm text-gray-600">
				Máximo permitido {{ formatCurrency(maxEditPaidInStoreDetailAmount) }}
			</p>
			<BaseInput
				v-model.number="editPaidInStoreDetailAmount"
				type="number"
				:max="maxEditPaidInStoreDetailAmount"
				placeholder="Monto"
				class="w-full"
			/>
		</div>
		<template #footer>
			<BaseButton
				variant="secondary"
				:disabled="editPaidInStoreDetailLoading"
				@click="showEditPaidInStoreDetailDialog = false"
			>
				Cancelar
			</BaseButton>
			<BaseButton
				variant="primary"
				:loading="editPaidInStoreDetailLoading"
				@click="confirmEditPaidInStoreDetail"
			>
				Guardar
			</BaseButton>
		</template>
	</BaseDialog>
</template>

<script setup lang="ts">
import OrderElectronicInvoicing from './OrderElectronicInvoicing.vue'
import OrderTypeBadge from '@/components/orders/OrderTypeBadge.vue';
import OrderSourceBadge from '@/components/orders/OrderSourceBadge.vue';
import OrderProgressBar from '@/components/orders/OrderProgressBar.vue';
import OrderNoteDialog from '@/components/orders/OrderNoteDialog.vue';
import OrderDetailProductsList from '@/components/orders/OrderDetailProductsList.vue';
import OrderDeliveryFeeEditor from '@/components/orders/OrderDeliveryFeeEditor.vue';
import { deliveryFeeValidationMessage, hasOrderDelivery } from '@/helpers/orderDeliveryFee';
import PaidInStoreCashPanel from '@/components/orders/PaidInStoreCashPanel.vue';
import EditCustomerModal from '@/components/orders/EditCustomerModal.vue';
import AssignDeliveryModal from '@/components/orders/AssignDeliveryModal.vue';
import CancelOrderModal from '@/components/orders/CancelOrderModal.vue';
import TransferOrderBranchDialog from '@/components/orders/TransferOrderBranchDialog.vue';
import EditOrderTypeModal from '@/components/orders/EditOrderTypeModal.vue';
import OrderBankPaymentSyncDialog from '@/components/orders/OrderBankPaymentSyncDialog.vue';
import BaseDialog from '@/components/ui/BaseDialog.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import OrderScheduleFields from './OrderScheduleFields.vue';
import { orderScheduleError } from '@/helpers/orderSchedule';
import PersistedPaymentSelector from '@/components/payments/PersistedPaymentSelector.vue';
import PhoneNumberItem from '@/components/customers/PhoneNumberItem.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useOrderPermissions } from '@/composables/useOrderPermissions';
import { useToast } from '@/composables/useToast';
import {
	getOrderStatusDisplayName,
	getOrderTypeDisplayName,
} from '@/composables/useFormatting';
import { useOrderStatusChange } from '@/composables/useOrderStatusChange';
import type {
	Order,
	OrderDetailView,
	OrderStatus,
	UpdateOrderDetailDto,
	UpdateOrderDto,
} from '@/types/order';
import type { DiscountCode } from '@/types/discountCode';
import type { Customer } from '@/types/customer';
import { useOrdersDataStore } from '@/store/ordersData';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import type { Product } from '@/types/product';
import { customerApi } from '@/services/MainAPI/customerApi';
import { orderApi } from '@/services/MainAPI/orderApi';
import { discountCodeApi } from '@/services/MainAPI/discountCodeApi';
import { bankPaymentApi } from '@/services/MainAPI/bankPaymentApi';
import { orderManagementApi } from '@/services/MainAPI/orderManagementApi';
import type { OrderOperationOptions } from '@/types/orderManagement';
import { useOrderSnapshotUpdates } from '@/composables/useOrderSnapshotUpdates';
import { useBranchContextStore } from '@/store/branchContext';
import OrderTrackingDialog from '@/components/orders/OrderTrackingDialog.vue';
import {
	toPaymentSnapshot,
	evaluateBankSyncAfterTotalChange,
	type OrderPaymentSnapshot,
	type BankSyncPrompt,
} from '@/utils/orderPaymentCoverage';
import {
	orderCashToCollect,
	sumPaymentsAmounts,
} from '@/utils/orderCashToCollect';
import {
	deliveryDiscountBudget,
	distributeEqualWithCaps,
	lineCapacityCop,
} from '@/composables/useFreeDeliveryDiscount';

import type { OrderListItem } from '@/types/order';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseLoading from '@/components/ui/BaseLoading.vue';

import {
	ArrowLeftIcon,
	XCircleIcon,
	PencilIcon,
	CheckCircleIcon,
	PrinterIcon,
    MapPinIcon,
} from '@heroicons/vue/24/outline';
import { ref, computed, watch, onMounted, nextTick, useId } from 'vue';
const detailId = useId();
const permissions = useOrderPermissions();
const authStore = useAuthStore();
const productsStore = useProductsStore();
const branchContext = useBranchContextStore();
const operationOptions = ref<OrderOperationOptions | null>(null);
const operationOptionsError = ref('');
const optionsLoading = ref(false);
const maxFreeDeliveryDiscount = computed(() => operationOptions.value?.maxFreeDeliveryDiscount ?? 0);
const refreshingOrder = ref(false);
const detailReload = ref(0);
const showTracking = ref(false);
const showTransferBranchDialog = ref(false);
const canManageInvoices = computed(() => ['Admin', 'Superadmin', 'Cashier'].includes(authStore.userRole ?? ''));
const isDeliveryman = computed(() => authStore.userRole === 'Deliveryman');
const pendingOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(
	null,
);
const originalOrderType = ref<'onsite' | 'delivery' | 'reservation' | null>(
	null,
);
const pendingDeleteReservationAssociations = ref(false);
// Estado local (solo lo que no está en el store)
const editableGuestName = ref('');
const detailEditor = ref<'notes' | 'schedule' | null>(null);
const editorSaveError = ref('');
const savingDeliveryFee = ref(false);
const editingProducts = ref(false);
const deliveryFeeSaveError = ref('');
const editableReservedForDate = ref<Date | null>(null);
const editablePrepareAtDate = ref<Date | null>(null);
const savingSchedule = ref(false);
const savingPrepareNow = ref(false);
const savingPaidInStore = ref(false);
const savingBenefit = ref(false);
const detailDiscountCodeInput = ref('');
const detailBenefitError = ref('');
const detailManualBenefitReason = ref('');
const detailManualGiftProductId = ref<number | null>(null);
const canGrantManualBenefit = computed(() => authStore.isAdmin || authStore.isSuperadmin);
const canSelectAnyOrderStatus = computed(() => authStore.isAdmin || authStore.isSuperadmin);
const detailGiftProducts = computed(() => productsStore.currentProducts.filter((p) => p.active && p.categoryName.trim().toLocaleLowerCase() === 'regalos'));
const canGiftDetailDelivery = computed(() => order.value?.type === 'delivery' || (order.value?.type === 'reservation' && order.value?.addressId != null));
const showRemovePaidInStoreDetailDialog = ref(false);
const removePaidInStoreDetailLoading = ref(false);
const showEditPaidInStoreDetailDialog = ref(false);
const editPaidInStoreDetailAmount = ref(0);
const editPaidInStoreDetailLoading = ref(false);
const showKitchenScheduleConfirm = ref(false);
const showPrepareNowConfirm = ref(false);
const showUncancelConfirm = ref(false);
const uncancelLoading = ref(false);
const reprintKitchenLoading = ref(false);
const reprintDeliveryLoading = ref(false);

function parseOrderDate(iso: string | Date | undefined | null): Date | null {
	if (iso === undefined || iso === null || iso === '') return null;
	const d = typeof iso === 'string' ? new Date(iso) : iso;
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

const customer = ref<Customer | null>(null);
const customerLoading = ref(false);
const customerError = ref<string | null>(null);

const props = defineProps<{
	flatOrder: OrderListItem;
}>();

const emit = defineEmits<{
	(e: 'delivered', orderId: number): void;
}>();

const order = ref<OrderDetailView | null>(null);
const { staleSnapshot, checkForChanges, markRefreshed } = useOrderSnapshotUpdates(order);
const canTransferBranch = computed(() => authStore.isSuperadmin && order.value != null && ['awaiting_payment', 'taken', 'in_preparation', 'ready'].includes(order.value.status));
const canViewTracking = computed(() => !isDeliveryman.value && order.value?.type === 'delivery' && order.value.status === 'on_the_way');
const appliedBenefitLabel = computed(() =>
	order.value?.appliedBenefitLabel || order.value?.loyaltyRuleName || (order.value?.freeDeliveryRequested ? 'Domicilio gratis aplicado' : ''),
);

type DetailLineDraft = UpdateOrderDetailDto & {
	productName?: string
	subtotal?: number
}

function updateDetailDiscountCodeInput(value: string | number | null) {
	detailDiscountCodeInput.value = String(value || '').toUpperCase();
	detailBenefitError.value = '';
}

function parseAppliedBenefitSnapshot(): any | null {
	if (!order.value?.appliedBenefitSnapshot) return null;
	try {
		return JSON.parse(order.value.appliedBenefitSnapshot);
	} catch {
		return null;
	}
}

function toDetailLineDrafts(source: OrderDetailView): DetailLineDraft[] {
	return source.orderDetails.map((item) => ({
		id: item.id,
		productId: item.productId,
		quantity: item.quantity,
		unitPrice: item.unitPrice,
		discount: Math.max(0, Math.round(Number(item.discount ?? 0))),
		notes: item.notes || undefined,
		productName: item.productName,
		subtotal: item.subtotal,
	}));
}

function orderDetailsGrossSubtotal(lines: DetailLineDraft[]) {
	return lines
		.filter((item) => !(item.unitPrice === 0 && item.discount === 0))
		.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice), 0);
}

function normalizeDetailLines(lines: DetailLineDraft[]): UpdateOrderDetailDto[] {
	return lines.map((item) => ({
		id: item.id,
		productId: item.productId,
		quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
		unitPrice: Math.max(0, Math.round(Number(item.unitPrice) || 0)),
		discount: Math.max(0, Math.round(Number(item.discount) || 0)),
		notes: item.notes || undefined,
	}));
}

function removePercentageBenefit(lines: DetailLineDraft[], percentage: number) {
	if (!Number.isFinite(percentage) || percentage <= 0) return lines;
	return lines.map((item) => {
		if (item.unitPrice <= 0) return item;
		const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice);
		const benefitDiscount = Math.round((gross * percentage) / 100);
		return {
			...item,
			discount: Math.max(0, Math.round(Number(item.discount ?? 0)) - benefitDiscount),
		};
	});
}

function removeFreeDeliveryBenefit(lines: DetailLineDraft[], sourceOrder: OrderDetailView) {
	const budget = deliveryDiscountBudget(sourceOrder.deliveryFee ?? 0, maxFreeDeliveryDiscount.value);
	if (budget <= 0 || lines.length === 0) return lines;
	const caps = lines.map((item) => Math.min(
		Math.max(0, Math.round(Number(item.discount ?? 0))),
		Math.max(0, item.quantity) * Math.max(0, item.unitPrice),
	));
	const shares = distributeEqualWithCaps(budget, caps);
	return lines.map((item, index) => ({
		...item,
		discount: Math.max(0, Math.round(Number(item.discount ?? 0)) - Math.max(0, shares[index] ?? 0)),
	}));
}

function stripAppliedBenefit(sourceOrder: OrderDetailView) {
	const snapshot = parseAppliedBenefitSnapshot() ?? {};
	const rewardType = sourceOrder.appliedBenefitRewardType;
	const giftProductId = Number(snapshot.giftProductId ?? 0) || null;
	let lines = toDetailLineDrafts(sourceOrder);

	if (rewardType === 'GiftProduct' && giftProductId) {
		lines = lines.filter((item) => !(item.productId === giftProductId && item.unitPrice === 0));
	} else if (rewardType === 'PercentageDiscount') {
		const percentage = Number(sourceOrder.appliedBenefitAmount ?? snapshot.discountPercentage ?? 0);
		lines = removePercentageBenefit(lines, percentage);
	} else if (rewardType === 'FreeDelivery') {
		lines = removeFreeDeliveryBenefit(lines, sourceOrder);
	}

	return lines;
}

function applyPercentageCode(lines: DetailLineDraft[], code: DiscountCode) {
	const percentage = Number(code.discountPercentage ?? 0);
	return lines.map((item) => {
		if (item.unitPrice <= 0) return item;
		const gross = Math.max(0, item.quantity) * Math.max(0, item.unitPrice);
		const add = Math.round((gross * percentage) / 100);
		return { ...item, discount: Math.max(0, Math.round(Number(item.discount ?? 0)) + add) };
	});
}

function applyFreeDeliveryCode(lines: DetailLineDraft[], sourceOrder: OrderDetailView) {
	const budget = deliveryDiscountBudget(sourceOrder.deliveryFee ?? 0, maxFreeDeliveryDiscount.value);
	const caps = lines.map((item) =>
		lineCapacityCop({
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			manualDiscount: item.discount ?? 0,
		}),
	);
	const shares = distributeEqualWithCaps(budget, caps);
	return lines.map((item, index) => ({
		...item,
		discount: Math.max(0, Math.round(Number(item.discount ?? 0)) + Math.max(0, shares[index] ?? 0)),
	}));
}

function buildClearBenefitPayload(sourceOrder: OrderDetailView): UpdateOrderDto {
	return {
		orderDetails: normalizeDetailLines(stripAppliedBenefit(sourceOrder)),
		freeDeliveryRequested: false,
		appliedBenefitType: 'None',
		appliedBenefitSourceId: null,
		appliedBenefitCode: null,
		appliedBenefitLabel: null,
		appliedBenefitRewardType: null,
		appliedBenefitAmount: null,
		appliedBenefitSnapshot: null,
		manualBenefitReason: null,
		manualBenefitGiftProductId: null,
	};
}

function buildApplyDiscountCodePayload(sourceOrder: OrderDetailView, code: DiscountCode): UpdateOrderDto {
	let lines = stripAppliedBenefit(sourceOrder);
	if (code.type === 'GiftProduct') {
		if (!code.giftProductId) throw new Error('El codigo no tiene producto regalo configurado.');
		lines = [
			...lines,
			{
				id: 0,
				productId: code.giftProductId,
				quantity: 1,
				unitPrice: 0,
				discount: 0,
				notes: `Codigo ${code.code}`,
				productName: code.giftProductName ?? code.label,
			},
		];
	} else if (code.type === 'PercentageDiscount') {
		lines = applyPercentageCode(lines, code);
	} else if (code.type === 'FreeDelivery') {
		lines = applyFreeDeliveryCode(lines, sourceOrder);
	}

	return {
		orderDetails: normalizeDetailLines(lines),
		freeDeliveryRequested: code.type === 'FreeDelivery',
		appliedBenefitType: 'DiscountCode',
		appliedBenefitSourceId: code.id,
		appliedBenefitCode: code.code,
		appliedBenefitLabel: code.label || `Codigo ${code.code}`,
		appliedBenefitRewardType: code.type,
		appliedBenefitAmount: code.type === 'PercentageDiscount' ? Number(code.discountPercentage ?? 0) : null,
		appliedBenefitSnapshot: JSON.stringify(code),
	};
}

function buildManualBenefitPayload(sourceOrder: OrderDetailView, rewardType: 'GiftProduct' | 'FreeDelivery', reason: string, product?: Product): UpdateOrderDto {
	let lines = stripAppliedBenefit(sourceOrder);
	if (rewardType === 'GiftProduct') {
		if (!product) throw new Error('Selecciona un producto regalo.');
		lines.push({ id: 0, productId: product.id, quantity: 1, unitPrice: 0, discount: 0, notes: `Regalo manual: ${reason}`, productName: product.name });
	} else {
		lines = applyFreeDeliveryCode(lines, sourceOrder);
	}
	return {
		orderDetails: normalizeDetailLines(lines),
		freeDeliveryRequested: rewardType === 'FreeDelivery',
		appliedBenefitType: 'Manual',
		appliedBenefitLabel: rewardType === 'GiftProduct' ? `Regalo manual: ${product!.name}` : 'Regalo manual: Domicilio gratis',
		appliedBenefitRewardType: rewardType,
		appliedBenefitSnapshot: JSON.stringify(product ? { giftProductId: product.id, giftProductName: product.name } : {}),
		manualBenefitReason: reason,
		manualBenefitGiftProductId: product?.id ?? null,
	};
}

async function applyManualGiftToDetail() {
	if (!order.value) return;
	const product = detailGiftProducts.value.find((p) => p.id === detailManualGiftProductId.value);
	if (!product) return;
	await updateDetailBenefit(buildManualBenefitPayload(order.value, 'GiftProduct', detailManualBenefitReason.value.trim(), product), `Se regalo ${product.name}.`);
	detailManualBenefitReason.value = ''; detailManualGiftProductId.value = null;
}

async function applyManualDeliveryToDetail() {
	if (!order.value) return;
	await updateDetailBenefit(buildManualBenefitPayload(order.value, 'FreeDelivery', detailManualBenefitReason.value.trim()), 'Se regalo el domicilio.');
	detailManualBenefitReason.value = ''; detailManualGiftProductId.value = null;
}

async function updateDetailBenefit(payload: UpdateOrderDto, successMessage: string) {
	if (!order.value || !operationOptions.value || optionsLoading.value) return;
	savingBenefit.value = true;
	detailBenefitError.value = '';
	const paymentSnapshotBefore = captureOrderPaymentSnapshot();
	try {
		await ordersDataStore.update(order.value.id, payload);
		success('Beneficio actualizado', 4000, successMessage);
		await promptBankSyncIfNeeded(paymentSnapshotBefore);
	} catch (err: any) {
		detailBenefitError.value = err?.message || 'No se pudo actualizar el beneficio.';
		error('Beneficio', detailBenefitError.value);
	} finally {
		savingBenefit.value = false;
	}
}

async function clearDetailBenefit() {
	if (!order.value) return;
	await updateDetailBenefit(buildClearBenefitPayload(order.value), 'El pedido quedo sin beneficio aplicado.');
}

async function applyDiscountCodeToDetail() {
	if (!order.value) return;
	const codeText = detailDiscountCodeInput.value.trim();
	if (!codeText) {
		detailBenefitError.value = 'Ingresa un codigo promocional.';
		return;
	}

	savingBenefit.value = true;
	detailBenefitError.value = '';
	try {
		const baseLines = stripAppliedBenefit(order.value);
		const response = await discountCodeApi.validate(
			order.value.branchId,
			codeText,
			orderDetailsGrossSubtotal(baseLines),
		);
		if (!response.isSuccess || !response.data) {
			throw new Error(response.message || 'Codigo promocional invalido.');
		}
		savingBenefit.value = false;
		await updateDetailBenefit(
			buildApplyDiscountCodePayload(order.value, response.data),
			`Se aplico el codigo ${response.data.code}.`,
		);
		detailDiscountCodeInput.value = '';
	} catch (err: any) {
		detailBenefitError.value = err?.message || 'Codigo promocional invalido.';
		error('Codigo promocional', detailBenefitError.value);
	} finally {
		savingBenefit.value = false;
	}
}

const showScheduleEditor = computed(() => {
	const o = order.value;
	if (!o || isDeliveryman.value) return false;
	if (!permissions.canEditOrder(o)) return false;
	if (o.status === 'delivered' || o.status === 'cancelled') return false;
	return true;
});

const showPrepareNowButton = computed(() => {
	const o = order.value;
	if (!o || !showScheduleEditor.value) return false;
	return o.type === 'reservation' || !!o.reservedFor || !!o.prepareAt;
});

const prepareNowTargetTypeLabel = computed(() =>
	order.value?.addressId ? 'Domicilio' : 'En el local',
);

const { formatDateTime, formatCurrency } = useFormatting();
const detailSections = [
    { id: 'info', name: 'Información' },
    { id: 'products', name: 'Productos' },
    { id: 'payments', name: 'Pagos' },
];

const { success, error } = useToast();

async function onReprintKitchen() {
	const o = order.value;
	if (!o) return;
	const branchId = o.branchId;
	if (!branchId) {
		error('Sin sucursal', 'El pedido no tiene sucursal asociada.');
		return;
	}
	reprintKitchenLoading.value = true;
	try {
		const res = await orderManagementApi.reprint(o.id, 'kitchen');
		if (!res.isSuccess) {
			error('Reimpresión', res.message || 'No se pudo encolar la comanda.');
			return;
		}
		success(
			'Comanda en cola',
			3500,
			'El agente de impresión la emitirá en breve.',
		);
	} catch (err: unknown) {
		const msg =
			err instanceof Error ? err.message : 'No se pudo encolar la reimpresión.';
		error('Reimpresión', msg);
	} finally {
		reprintKitchenLoading.value = false;
	}
}

async function onReprintDelivery() {
	const o = order.value;
	if (!o) return;
	const branchId = o.branchId;
	if (!branchId) {
		error('Sin sucursal', 'El pedido no tiene sucursal asociada.');
		return;
	}
	reprintDeliveryLoading.value = true;
	try {
		const res = await orderManagementApi.reprint(o.id, 'delivery');
		if (!res.isSuccess) {
			error('Reimpresión', res.message || 'No se pudo encolar el ticket.');
			return;
		}
		success('Ticket en cola', 3500, 'El agente lo imprimirá en breve.');
	} catch (err: unknown) {
		const msg =
			err instanceof Error ? err.message : 'No se pudo encolar la reimpresión.';
		error('Reimpresión', msg);
	} finally {
		reprintDeliveryLoading.value = false;
	}
}

// Modales
const showEditCustomerModal = ref(false);

const {
	pendingStatusChange,
	showAssignDeliveryModal,
	handleStatusChange: handleStatusChangeComposable,
	clearPendingStatusChange,
} = useOrderStatusChange();



// Store
const ordersDataStore = useOrdersDataStore();

// Opciones para selectores de pagos
const bankOptions = computed(() => {
	return (operationOptions.value?.banks ?? [])
		.filter((bank) => bank.active)
		.map((bank) => ({ value: bank.id, label: bank.name }));
});

const appOptions = computed(() => {
	return (operationOptions.value?.apps ?? [])
		.filter((app) => app.active)
		.map((app) => ({ value: app.id, label: app.name }));
});

const showCancelModal = ref(false);
const showEditOrderTypeModal = ref(false);

const paymentsSectionRef = ref<HTMLElement | null>(null);
const paymentsDetailsRef = ref<HTMLDetailsElement | null>(null);
const showBankSyncDialog = ref(false);
const bankSyncPrompt = ref<BankSyncPrompt>({ kind: 'none' });
const bankSyncAdjusting = ref(false);

function captureOrderPaymentSnapshot(): OrderPaymentSnapshot | null {
	if (!order.value) return null;
	return toPaymentSnapshot(order.value);
}

async function promptBankSyncIfNeeded(snapshot: OrderPaymentSnapshot | null) {
	await nextTick();
	const current = ordersDataStore.current;
	if (!snapshot || !current) return;
	if (!permissions.canEditPayments(current)) return;
	const prompt = evaluateBankSyncAfterTotalChange(snapshot, current);
	if (prompt.kind === 'none') return;
	bankSyncPrompt.value = prompt;
	showBankSyncDialog.value = true;
}

function scrollToPaymentsTab() {
	if (paymentsDetailsRef.value) paymentsDetailsRef.value.open = true;
	void nextTick(() => {
		paymentsSectionRef.value?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	});
	showBankSyncDialog.value = false;
}

async function onConfirmBankPaymentAdjust() {
	const p = bankSyncPrompt.value;
	if (p.kind !== 'adjust' || !order.value) return;
	bankSyncAdjusting.value = true;
	try {
		const updated = await bankPaymentApi.updateBankPayment(
			p.paymentId,
			p.newTotal, order.value);
		const newPayments = order.value.bankPayments.map((bp) =>
			bp.id === p.paymentId ? { ...bp, ...(updated as object) } : bp,
		) as OrderDetailView['bankPayments'];
		handlePaymentUpdated({ bankPayments: newPayments });
		success(
			'Pago actualizado',
			4000,
			'El monto bancario coincide con el nuevo total',
		);
		showBankSyncDialog.value = false;
		bankSyncPrompt.value = { kind: 'none' };
	} catch (err: any) {
		error('Error al actualizar pago', err.message);
	} finally {
		bankSyncAdjusting.value = false;
	}
}

const loadCustomer = async (customerId: number) => {
	if (!customerId) return;

	customerLoading.value = true;
	customerError.value = null;

	try {
		const response = await customerApi.getCustomerById(customerId);
		customer.value = response.data;
	} catch (err: any) {
		console.error('Error loading customer:', err);
		customerError.value = 'No se pudieron cargar los teléfonos';
		customer.value = null;
	} finally {
		customerLoading.value = false;
	}
};

const cashAmount = computed(() => {
	if (!order.value) return 0;
	return orderCashToCollect(
		order.value.total,
		{
			bankPayments: order.value.bankPayments,
			appPayments: order.value.appPayments,
		},
		{
			floorAtZero: true,
			paidInStoreCash: order.value.paidInStoreCash === true,
			paidInStoreCashAmount: order.value.paidInStoreCashAmount ?? null,
		},
	);
});

/** Remanente antes de efectivo en tienda (alineado con borrador / selector de pagos). */
const detailNonStoreCashRemainder = computed(() => {
	const o = order.value;
	if (!o) return 0;
	return orderCashToCollect(
		o.total,
		{ bankPayments: o.bankPayments, appPayments: o.appPayments },
		{ floorAtZero: true },
	);
});

const showPaidInStoreDetailPanel = computed(() => {
	const o = order.value;
	if (!o) return false;
	if (o.paidInStoreCash === true) return true;
	return (
		permissions.canEditPayments(o) && detailNonStoreCashRemainder.value > 0
	);
});

const paidInStoreCap = computed(() => {
	const o = order.value;
	if (!o) return 0;
	return Math.max(
		0,
		o.total -
			sumPaymentsAmounts(o.bankPayments) -
			sumPaymentsAmounts(o.appPayments),
	);
});

const paidInStoreDisplayAmountDetail = computed(() => {
	const o = order.value;
	if (!o) return 0;
	if (
		typeof o.paidInStoreCashAmount === 'number' &&
		Number.isFinite(o.paidInStoreCashAmount)
	) {
		return o.paidInStoreCashAmount;
	}
	return paidInStoreCap.value;
});

const maxEditPaidInStoreDetailAmount = computed(() => paidInStoreCap.value);

function openRemovePaidInStoreDetail() {
	showRemovePaidInStoreDetailDialog.value = true;
}

function openEditPaidInStoreDetail() {
	const o = order.value;
	if (!o) return;
	const cap = paidInStoreCap.value;
	const seed =
		typeof o.paidInStoreCashAmount === 'number' &&
		Number.isFinite(o.paidInStoreCashAmount)
			? o.paidInStoreCashAmount
			: Math.max(1, cap);
	editPaidInStoreDetailAmount.value = cap < 1 ? 0 : Math.min(seed, cap);
	showEditPaidInStoreDetailDialog.value = true;
}

async function confirmRemovePaidInStoreDetail() {
	if (!order.value) return;
	removePaidInStoreDetailLoading.value = true;
	try {
		const updated = await orderApi.setPaidInStoreCash(order.value.id, false, undefined, order.value);
		const u = updated as unknown as {
			paidInStoreCash?: boolean;
			paidInStoreCashAt?: string | null;
			paidInStoreCashAmount?: number | null;
			updatedAt?: string;
		};
		handleModalUpdated({
			paidInStoreCash: Boolean(u.paidInStoreCash),
			paidInStoreCashAt: u.paidInStoreCashAt ?? null,
			paidInStoreCashAmount:
				typeof u.paidInStoreCashAmount === 'number'
					? u.paidInStoreCashAmount
					: null,
			updatedAt: u.updatedAt ?? order.value.updatedAt,
		});
		success('Actualizado', 4000, 'Se quitó el cobro en tienda');
		showRemovePaidInStoreDetailDialog.value = false;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'No se pudo actualizar';
		error('Error', msg);
	} finally {
		removePaidInStoreDetailLoading.value = false;
	}
}

async function confirmEditPaidInStoreDetail() {
	const o = order.value;
	if (!o) return;
	const amount = Number(editPaidInStoreDetailAmount.value);
	const max = maxEditPaidInStoreDetailAmount.value;
	if (!Number.isFinite(amount) || amount < 1) {
		error('Monto inválido', 'Ingresa un monto mayor a cero.');
		return;
	}
	if (amount > max) {
		error('Monto inválido', `El máximo permitido es ${formatCurrency(max)}.`);
		return;
	}
	editPaidInStoreDetailLoading.value = true;
	try {
		const updated = await orderApi.setPaidInStoreCash(o.id, true, amount, o);
		const u = updated as unknown as {
			paidInStoreCash?: boolean;
			paidInStoreCashAt?: string | null;
			paidInStoreCashAmount?: number | null;
			updatedAt?: string;
		};
		handleModalUpdated({
			paidInStoreCash: Boolean(u.paidInStoreCash),
			paidInStoreCashAt: u.paidInStoreCashAt ?? null,
			paidInStoreCashAmount:
				typeof u.paidInStoreCashAmount === 'number'
					? u.paidInStoreCashAmount
					: amount,
			updatedAt: u.updatedAt ?? o.updatedAt,
		});
		success('Monto actualizado', 4000, 'Efectivo en tienda guardado');
		showEditPaidInStoreDetailDialog.value = false;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'No se pudo actualizar';
		error('Error', msg);
	} finally {
		editPaidInStoreDetailLoading.value = false;
	}
}

// Sincronizar order del store
const ordersDataStoreCurrent = computed(() => ordersDataStore.current);
watch(
	ordersDataStoreCurrent,
	(newOrder) => {
		if (newOrder) {
            if (order.value?.id !== newOrder.id) detailEditor.value = null;
			order.value = newOrder;
			editableGuestName.value = newOrder.guestName || '';
            if (detailEditor.value !== 'schedule') {
                editableReservedForDate.value = parseOrderDate(newOrder.reservedFor);
                editablePrepareAtDate.value = parseOrderDate(newOrder.prepareAt);
            }
			// Cargar cliente completo si hay customerId
			if (newOrder.customerId) {
				loadCustomer(newOrder.customerId);
			} else {
				customer.value = null;
			}
		}
	},
	{ immediate: true },
);

// Keep destination-specific options local; never replace the active POS draft catalogs.
let optionsRequest = 0;
async function loadOperationOptions() {
    const o = order.value;
    const request = ++optionsRequest;
    operationOptions.value = null;
    if (!o || !['Admin', 'Superadmin', 'Cashier'].includes(authStore.userRole ?? '')) return;
    optionsLoading.value = true;
    try {
        const response = await orderManagementApi.options(o.id);
        if (request !== optionsRequest || order.value?.id !== o.id) return;
        operationOptions.value = response;
        operationOptionsError.value = '';
    } catch (err: unknown) {
        if (request === optionsRequest) operationOptionsError.value = err instanceof Error ? err.message : 'No se pudieron cargar las opciones del pedido.';
    } finally {
        if (request === optionsRequest) optionsLoading.value = false;
    }
}
watch(() => order.value?.id, () => { void loadOperationOptions(); }, { immediate: true });
onMounted(() => {
    if (canGrantManualBenefit.value) void productsStore.ensureCatalogLoaded();
});
const isRemoteOrder = computed(() => {
    const workspace = authStore.isSuperadmin ? branchContext.selectedBranchId : authStore.branchId;
    return !!order.value && workspace != null && order.value.originBranchId === workspace && order.value.branchId !== workspace;
});
const orderReturnQuery = computed<Record<string, string>>((): Record<string, string> => isRemoteOrder.value && order.value
    ? { remoteBranchId: String(order.value.branchId) } : {});
async function handleBranchTransferred(targetBranchId: number) {
    showTransferBranchDialog.value = false;
    // A second transfer may leave the current workspace outside both the
    // immutable origin and the new dispatch branch.
    if (branchContext.selectedBranchId !== order.value?.originBranchId
        && branchContext.selectedBranchId !== targetBranchId
        && authStore.user) {
        await branchContext.selectBranch(authStore.user, targetBranchId, { force: true });
    }
    await reloadOrder();
    success('Pedido trasladado', 4000, 'El pedido conserva su número e historial.');
}

async function reloadOrder() {
    if (!order.value) return;
    refreshingOrder.value = true;
    try {
        await ordersDataStore.fetchById(order.value.id, { silent: true });
        markRefreshed();
        detailReload.value++;
        editingProducts.value = false;
        detailEditor.value = null;
        editableReservedForDate.value = parseOrderDate(order.value?.reservedFor);
        editablePrepareAtDate.value = parseOrderDate(order.value?.prepareAt);
        await loadOperationOptions();
    } catch (err: unknown) {
        error('No se pudo actualizar', err instanceof Error ? err.message : 'Intenta nuevamente.');
    } finally { refreshingOrder.value = false; }
}

const handleStatusChange = async (newStatus: OrderStatus) => {
	if (!order.value) return;

	await handleStatusChangeComposable(order.value, newStatus, (updatedOrder) => {
		// ✅ Actualización optimista usando helper
		updateOrderStatus(updatedOrder);
	});
};

const confirmUncancelOrder = async () => {
	if (!order.value) return;

	uncancelLoading.value = true;
	try {
		const updatedOrder = await orderApi.updateStatus(order.value.id, 'ready', undefined, order.value);
		const orderAny = updatedOrder as any;
		ordersDataStore.updateCurrent({
			status: updatedOrder.status,
			statusDisplayName: orderAny.statusDisplayName,
			statusTimes: orderAny.statusTimes || order.value.statusTimes,
			type: orderAny.type ?? order.value.type,
			typeDisplayName: orderAny.typeDisplayName ?? order.value.typeDisplayName,
			cancelledReason: null,
			updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
		});
		success('Pedido descancelado', 4000, 'El pedido quedo como Listo');
		showUncancelConfirm.value = false;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'No se pudo descancelar el pedido';
		error('Error al descancelar', msg);
	} finally {
		uncancelLoading.value = false;
	}
};

const handleDeliverOrder = async () => {
	if (!order.value) return;
	emit('delivered', order.value.id);
};

const updateGuestName = async () => {
	if (!order.value || editableGuestName.value === order.value.guestName) return;

	try {
		await ordersDataStore.update(order.value.id, {
			guestName: editableGuestName.value || undefined,
		});
		success('Actualizado', 5000, 'Nombre del invitado actualizado');
		// ✅ No necesita recargar, update ya actualizó current
	} catch (err: any) {
		error('Error', err.message);
	}
};

function openDetailEditor(section: 'notes' | 'schedule') {
    if (!order.value || staleSnapshot.value || (section === 'notes' ? !permissions.canEditOrder(order.value) : !showScheduleEditor.value)) return;
    editablePrepareAtDate.value = parseOrderDate(order.value.prepareAt);
    editableReservedForDate.value = parseOrderDate(order.value.reservedFor);
    editorSaveError.value = '';
    detailEditor.value = section;
}

const updateNotes = async (notes: string) => {
    if (!order.value || staleSnapshot.value || !permissions.canEditOrder(order.value)) throw new Error('El pedido ya no permite editar las notas.');
    await ordersDataStore.update(order.value.id, { notes });
    success('Actualizado', 5000, 'Notas actualizadas');
};

function updateEditableSchedule(schedule: { prepareAt: Date | null; reservedFor: Date | null }) {
    editablePrepareAtDate.value = schedule.prepareAt;
    editableReservedForDate.value = schedule.reservedFor;
}

const saveSchedule = () => {
	if (!order.value || !showScheduleEditor.value || savingSchedule.value || staleSnapshot.value) return;
	if (!editableReservedForDate.value) {
		error('Horarios', 'Indica fecha y hora de entrega (tener listo).');
		return;
	}

    const scheduleError = orderScheduleError(editablePrepareAtDate.value, editableReservedForDate.value);
    if (scheduleError) { error('Horarios', scheduleError); return; }

	const st = order.value.status;
	if (st === 'taken' || st === 'in_preparation') {
		showKitchenScheduleConfirm.value = true;
		return;
	}

	void doSaveSchedule();
};

function confirmKitchenScheduleSave() {
	showKitchenScheduleConfirm.value = false;
	void doSaveSchedule();
}

async function doSaveSchedule() {
	if (
		!order.value ||
		!showScheduleEditor.value ||
        savingSchedule.value || staleSnapshot.value ||
		!editableReservedForDate.value
	)
		return;

	savingSchedule.value = true;
    editorSaveError.value = '';
	try {
		const reservedIso = editableReservedForDate.value.toISOString();
		const payload: { reservedFor: string; prepareAt?: string } = {
			reservedFor: reservedIso,
		};
		if (editablePrepareAtDate.value) {
			payload.prepareAt = editablePrepareAtDate.value.toISOString();
		}
		await ordersDataStore.update(order.value.id, payload as any);
        detailEditor.value = null;
		success(
			'Horarios actualizados',
			5000,
			'Cocina y domiciliario recibirán aviso si aplica.',
		);
	} catch (err: any) {
        editorSaveError.value = err.message || 'No se pudieron guardar los horarios. Intenta nuevamente.';
	} finally {
		savingSchedule.value = false;
	}
}

function onPrepareNowClick() {
	const o = order.value;
	if (!o || !showPrepareNowButton.value) return;
	if (o.addressId) {
		if (!o.customerId || !o.guestName?.trim()) {
			error(
				'Datos incompletos',
				'Para dejarlo como domicilio se requiere cliente, dirección y nombre de quien recibe.',
			);
			return;
		}
	}
	showPrepareNowConfirm.value = true;
}

async function executePrepareNow() {
	const o = order.value;
	if (!o) return;
	showPrepareNowConfirm.value = false;
	savingPrepareNow.value = true;
	try {
		const useDelivery = !!o.addressId;
		if (useDelivery && (!o.customerId || !o.guestName?.trim())) {
			error(
				'Datos incompletos',
				'Completa cliente, dirección y nombre para domicilio.',
			);
			return;
		}
		const now = new Date();
		await ordersDataStore.update(o.id, {
			type: useDelivery ? 'delivery' : 'onsite',
			prepareAt: now,
			reservedFor: null as unknown as undefined,
		} as any);
        detailEditor.value = null;
		success(
			'Preparar ya',
			5000,
			`${useDelivery ? 'Domicilio' : 'En el local'}: preparación desde este momento. Cocina recibirá aviso si aplica.`,
		);
	} catch (err: any) {
		error('Error', err.message);
	} finally {
		savingPrepareNow.value = false;
	}
}

const updateDeliveryFee = async (next: number) => {
	if (!order.value || savingDeliveryFee.value || editingProducts.value || savingProducts.value || staleSnapshot.value || !permissions.canEditDeliveryFee(order.value)) return;
	deliveryFeeSaveError.value = deliveryFeeValidationMessage(next);
	if (deliveryFeeSaveError.value) return;
	const current =
		order.value.deliveryFee !== null && order.value.deliveryFee !== undefined
			? Math.round(Number(order.value.deliveryFee))
			: 0;
	if (next === current) return;

	savingDeliveryFee.value = true;
	const paymentSnapshotBefore = captureOrderPaymentSnapshot();
	try {
		await ordersDataStore.update(order.value.id, { deliveryFee: next });
		success('Tarifa actualizada', 4000, 'Se recalculó el total del pedido');
		await promptBankSyncIfNeeded(paymentSnapshotBefore);
	} catch (err: any) {
		deliveryFeeSaveError.value = err.message || 'No se pudo guardar la tarifa. Intenta nuevamente.';
		error('Error al guardar tarifa', deliveryFeeSaveError.value);
	} finally {
		savingDeliveryFee.value = false;
	}
};

const savingProducts = ref(false);
const saveProductNote = async (itemId: number, notes: string) => {
    if (!order.value || staleSnapshot.value || savingProducts.value || savingDeliveryFee.value || editingProducts.value || !permissions.canEditProducts(order.value)) {
        throw new Error('El pedido ya no permite editar los productos.');
    }
    if (!order.value.orderDetails.some(item => item.id === itemId)) throw new Error('El producto ya no está en el pedido.');
    savingProducts.value = true;
    try {
        await ordersDataStore.update(order.value.id, {
            orderDetails: order.value.orderDetails.map(item => ({
                id: item.id, productId: item.productId, quantity: item.quantity,
                unitPrice: item.unitPrice, discount: item.discount,
                notes: item.id === itemId ? notes : (item.notes ?? ''),
            })),
        });
        success('Actualizado', 4000, 'Nota del producto actualizada');
    } finally {
        savingProducts.value = false;
    }
};

const handleProductsUpdate = async (payload: {
	products: UpdateOrderDetailDto[];
	freeDeliveryRequested: boolean;
}) => {
	if (!order.value) return;

	savingProducts.value = true;
	const paymentSnapshotBefore = captureOrderPaymentSnapshot();
	try {
		await ordersDataStore.update(order.value.id, {
			orderDetails: payload.products,
			freeDeliveryRequested: payload.freeDeliveryRequested,
		});
		success(
			'Productos actualizados',
			5000,
			'Los productos del pedido han sido actualizados',
		);
		await promptBankSyncIfNeeded(paymentSnapshotBefore);
	} catch (err: any) {
		error('Error al actualizar productos', err.message);
	} finally {
		savingProducts.value = false;
	}
};

const handleRequestCancelOrderFromProducts = () => {
	if (!order.value || !permissions.canCancel(order.value)) return;
	showCancelModal.value = true;
};

const handlePaymentUpdated = (updates: Partial<OrderDetailView>) => {
    ordersDataStore.updateCurrent(updates);
    if (order.value) void ordersDataStore.fetchById(order.value.id, { silent: true }).catch(() => { void checkForChanges(); });
};

const onPaidInStoreChange = async (checked: boolean) => {
	if (!order.value || order.value.paidInStoreCash === checked) return;
	savingPaidInStore.value = true;
	try {
		const updated = await orderApi.setPaidInStoreCash(order.value.id, checked, undefined, order.value);
		const u = updated as unknown as {
			paidInStoreCash?: boolean;
			paidInStoreCashAt?: string | null;
			paidInStoreCashAmount?: number | null;
			updatedAt?: string;
		};
		handleModalUpdated({
			paidInStoreCash: Boolean(u.paidInStoreCash),
			paidInStoreCashAt: u.paidInStoreCashAt ?? null,
			paidInStoreCashAmount:
				typeof u.paidInStoreCashAmount === 'number'
					? u.paidInStoreCashAmount
					: null,
			updatedAt: u.updatedAt ?? order.value.updatedAt,
		});
		success(
			'Actualizado',
			4000,
			checked
				? 'Marcado como pagado en efectivo en tienda'
				: 'Marcador de pago en tienda quitado',
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'No se pudo actualizar';
		error('Error', msg);
	} finally {
		savingPaidInStore.value = false;
	}
};

const handleAssignDeliveryModalClose = () => {
	clearPendingStatusChange();
};

const handleDeliverymanUpdated = (updatedOrder?: any) => {
	if (!order.value || !updatedOrder) return;
	updateOrderDeliveryman(updatedOrder);
};

const handleOrderCancelled = (updatedOrder: Order) => {
	if (!order.value || updatedOrder.id !== order.value.id) return;
	const updated = updatedOrder as Order & {
		statusDisplayName?: string | null;
		statusTimes?: Record<string, string>;
		cancelledReason?: string | null;
	};

	ordersDataStore.updateCurrent({
		status: 'cancelled',
		statusDisplayName:
			updated.statusDisplayName || getOrderStatusDisplayName('cancelled'),
		statusTimes: updated.statusTimes || order.value.statusTimes,
		cancelledReason: updated.cancelledReason ?? null,
		bankPayments: [],
		appPayments: [],
		reservationDeposits: [],
		totalDeposited: 0,
		updatedAt: updated.updatedAt || order.value.updatedAt,
	});
	showCancelModal.value = false;
};

// Handlers optimistas para actualización sin recarga
const handleOrderTypeUpdated = (
	updatedOrder?: any,
	paymentSnapshotBefore?: OrderPaymentSnapshot | null,
) => {
	if (!updatedOrder) return;

	const orderAny = updatedOrder as any;
	const snapshot = paymentSnapshotBefore ?? captureOrderPaymentSnapshot();
	handleModalUpdated({
		type: orderAny.type,
		typeDisplayName:
			orderAny.typeDisplayName ?? getOrderTypeDisplayName(orderAny.type),
		deliveryFee: orderAny.deliveryFee ?? null,
		reservedFor: orderAny.reservedFor || null,
		prepareAt: orderAny.prepareAt || null,
		addressId: orderAny.addressId ?? null,
		addressDescription: orderAny.addressDescription || null,
		addressAdditionalInfo: orderAny.addressAdditionalInfo ?? null,
		updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
		...(typeof orderAny.total === 'number'
			? {
					total: orderAny.total,
					...(typeof orderAny.subtotal === 'number'
						? { subtotal: orderAny.subtotal }
						: {}),
					...(typeof orderAny.discountTotal === 'number'
						? { discountTotal: orderAny.discountTotal }
						: {}),
				}
			: {}),
	});

	pendingOrderType.value = null;
	originalOrderType.value = null;
	pendingDeleteReservationAssociations.value = false;
	void promptBankSyncIfNeeded(snapshot);
};

const handleTypePendingChange = (
	newType: 'onsite' | 'delivery' | 'reservation',
) => {
	if (!order.value) return;

	// Guardar tipo original si es la primera vez
	if (!originalOrderType.value) {
		originalOrderType.value = order.value.type;
	}

	// Actualizar temporalmente el tipo en la UI
	pendingOrderType.value = newType;
	updateOrderType(newType);
};

const handleReservationAssociatedDeleteConfirmed = () => {
	pendingDeleteReservationAssociations.value = true;
};

const handleOpenCustomerModalFromType = () => {
	showEditCustomerModal.value = true;
};

const handleCustomerModalClose = () => {
	// Si había un cambio de tipo pendiente y se canceló el modal de cliente
	if (pendingOrderType.value && originalOrderType.value && order.value) {
		// Revertir el tipo
		updateOrderType(originalOrderType.value);
		pendingOrderType.value = null;
		originalOrderType.value = null;
		pendingDeleteReservationAssociations.value = false;
	}
	showEditCustomerModal.value = false;
};
const updateOrderStatus = (updatedOrder: any) => {
	const orderAny = updatedOrder as any;
	ordersDataStore.updateCurrent({
		status: updatedOrder.status,
		statusDisplayName: orderAny.statusDisplayName,
		statusTimes: orderAny.statusTimes || order.value!.statusTimes,
		updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
	});
};

const updateOrderDeliveryman = (updatedOrder: any) => {
	const orderAny = updatedOrder as any;
	ordersDataStore.updateCurrent({
		deliveryManId: orderAny.deliveryManId || null,
		deliveryManName: orderAny.deliveryManName || null,
		status: orderAny.status,
		statusDisplayName: orderAny.statusDisplayName,
		statusTimes: orderAny.statusTimes || order.value!.statusTimes,
		updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
	});
};

const updateOrderType = (newType: 'onsite' | 'delivery' | 'reservation') => {
	ordersDataStore.updateCurrent({
		type: newType,
		typeDisplayName: getOrderTypeDisplayName(newType),
	});
};
const handleCustomerUpdated = async (
	updatedOrder?: any,
	paymentSnapshotBefore?: OrderPaymentSnapshot | null,
) => {
	if (!updatedOrder) return;
	const orderAny = updatedOrder as any;
	const snapshot = paymentSnapshotBefore ?? captureOrderPaymentSnapshot();

	// Si había un cambio de tipo pendiente, guardarlo junto con los datos del cliente
	if (pendingOrderType.value) {
		try {
			// ✅ Enviar tipo + datos del cliente en una sola petición
			const finalUpdate = await ordersDataStore.update(order.value!.id, {
				type: pendingOrderType.value,
				customerId: orderAny.customerId,
				addressId: orderAny.addressId,
				guestName: orderAny.guestName,
				deliveryFee: orderAny.deliveryFee,
				...(pendingDeleteReservationAssociations.value
					? { deleteReservationAssociatedPayments: true }
					: {}),
			});

			// Actualización optimista con la respuesta del backend
			updateOrderCustomer(finalUpdate);

			// Limpiar estado temporal
			pendingOrderType.value = null;
			originalOrderType.value = null;
			pendingDeleteReservationAssociations.value = false;
			await promptBankSyncIfNeeded(snapshot);
		} catch (err: any) {
			error('Error al actualizar pedido', err.message);
		}
	} else {
		// Actualización normal (sin cambio de tipo) - usar handler unificado
		handleModalUpdated({
			customerId: orderAny.customerId,
			customerName: orderAny.customerName,
			customerPhone: orderAny.customerPhone,
			guestName: orderAny.guestName,
			deliveryFee: orderAny.deliveryFee || order.value?.deliveryFee || 0,
			updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
			...(typeof orderAny.total === 'number'
				? {
						total: orderAny.total,
						...(typeof orderAny.subtotal === 'number'
							? { subtotal: orderAny.subtotal }
							: {}),
						...(typeof orderAny.discountTotal === 'number'
							? { discountTotal: orderAny.discountTotal }
							: {}),
					}
				: {}),
		});
		await promptBankSyncIfNeeded(snapshot);
	}

	// Recargar cliente completo si hay customerId nuevo o cambiado
	if (orderAny.customerId) {
		await loadCustomer(orderAny.customerId);
	} else {
		customer.value = null;
	}

	// ✅ Cerrar el modal después de actualizar exitosamente
	showEditCustomerModal.value = false;
};

// Handler unificado para todos los modales autónomos
const handleModalUpdated = (updates: Partial<OrderDetailView>) => {
	ordersDataStore.updateCurrent(updates);
};

const updateOrderCustomer = (updatedOrder: any) => {
	const orderAny = updatedOrder as any;
	ordersDataStore.updateCurrent({
		type: orderAny.type,
		typeDisplayName: getOrderTypeDisplayName(orderAny.type),
		customerId: orderAny.customerId || null,
		customerName: orderAny.customerName || null,
		customerPhone: orderAny.customerPhone || null,
		addressId: orderAny.addressId || null,
		addressDescription: orderAny.addressDescription || null,
		addressAdditionalInfo: orderAny.addressAdditionalInfo ?? null,
		guestName: orderAny.guestName || null,
		deliveryFee: orderAny.deliveryFee ?? null,
		updatedAt: orderAny.updatedAt,
        managementVersion: orderAny.managementVersion ?? order.value?.managementVersion,
		...(typeof orderAny.total === 'number'
			? {
					total: orderAny.total,
					...(typeof orderAny.subtotal === 'number'
						? { subtotal: orderAny.subtotal }
						: {}),
					...(typeof orderAny.discountTotal === 'number'
						? { discountTotal: orderAny.discountTotal }
						: {}),
				}
			: {}),
	});
};
</script>

<style scoped>
.order-info :deep(input), .order-info :deep(textarea) { min-width: 0; }
@media (pointer: coarse) {
    .order-detail :deep(button), .order-detail summary, .order-detail nav a { min-height: 44px; }
    .order-info :deep(input), .order-info :deep(textarea) { font-size: 16px; }
}

.order-info-grid > div {
    min-width: 0;
}
</style>
