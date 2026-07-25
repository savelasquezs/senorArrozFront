<template>
	<div class="flex items-center gap-2">
		<span v-if="branchContext.isLoading" class="text-xs text-gray-500">
			Cargando sucursales…
		</span>
		<select
			v-else-if="branchContext.hasBranches"
			:value="branchContext.selectedBranchId ?? ''"
			class="max-w-48 text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
			aria-label="Sucursal activa"
			:disabled="changing"
			@change="changeBranch"
		>
			<option
				v-for="branch in branchContext.options"
				:key="branch.id"
				:value="branch.id"
			>
				{{ branch.name }}
			</option>
		</select>
		<RouterLink
			v-else
			to="/branches"
			class="text-sm font-medium text-emerald-700 hover:text-emerald-800"
		>
			Administrar sucursales
		</RouterLink>
		<span v-if="branchContext.error" class="text-xs text-red-600" :title="branchContext.error">
			No disponible
		</span>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'
import { bootstrapOrderCatalog } from '@/utils/orderCatalogBootstrap'
import { resetBranchScopedState } from '@/utils/branchScopedState'

const authStore = useAuthStore()
const branchContext = useBranchContextStore()
const route = useRoute()
const router = useRouter()
const changing = ref(false)

async function changeBranch(event: Event) {
	const user = authStore.user
	const branchId = Number((event.target as HTMLSelectElement).value)
	if (!user || !branchContext.selectBranch(user, branchId)) {
		;(event.target as HTMLSelectElement).value = String(branchContext.selectedBranchId ?? '')
		return
	}

	changing.value = true
	try {
		resetBranchScopedState(branchId)
		const detailMatch = route.path.match(/^\/branches\/\d+/)
		if (detailMatch) {
			await router.replace({
				path: route.path.replace(/^\/branches\/\d+/, `/branches/${branchId}`),
				query: route.query,
				hash: route.hash,
			})
		}
		await bootstrapOrderCatalog(authStore.userRole, branchId)
	} finally {
		changing.value = false
	}
}
</script>
