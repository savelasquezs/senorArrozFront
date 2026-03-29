import { UserRole } from '@/types/auth'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useBanksStore } from '@/store/banks'
import { useAppsStore } from '@/store/apps'
import { useCustomersStore } from '@/store/customers'

/** Roles que usan catálogo de pedidos (productos/categorías transversales + bancos/apps por token). */
const ROLES_ORDER_CATALOG: string[] = [
	UserRole.SUPERADMIN,
	UserRole.ADMIN,
	UserRole.CASHIER,
]

/**
 * Precarga idempotente: una sola tanda de red por sesión (store + promesa en vuelo).
 * Úsese tras login, restaurar sesión, o primera vista con layout (p. ej. F5).
 */
export async function bootstrapOrderCatalog(userRole: string | null): Promise<void> {
	if (!userRole || !ROLES_ORDER_CATALOG.includes(userRole)) {
		return
	}
	try {
		await Promise.all([
			useProductsStore().ensureCatalogLoaded(),
			useProductCategoriesStore().ensureCatalogLoaded(),
			useBanksStore().ensureListLoaded(),
			useAppsStore().ensureListLoaded(),
			useCustomersStore().ensureNeighborhoodsLoaded(),
		])
	} catch (err) {
		console.error('bootstrapOrderCatalog:', err)
	}
}
