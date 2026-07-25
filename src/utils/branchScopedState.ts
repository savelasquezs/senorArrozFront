import { useAppsStore } from '@/store/apps'
import { useAppPaymentsStore } from '@/store/appPayments'
import { useBanksStore } from '@/store/banks'
import { useBankPaymentsStore } from '@/store/bankPayments'
import { useBranchesStore } from '@/store/branches'
import { useBranchPosSettingsStore } from '@/store/branchPosSettings'
import { useCustomersStore } from '@/store/customers'
import { useOrdersDataStore } from '@/store/ordersData'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useWhatsAppStore } from '@/store/whatsapp'

/**
 * Removes every cached value that can belong to the previously selected branch.
 * Draft orders are preserved; only the visible/active draft partition is changed.
 */
export function resetBranchScopedState(branchId: number): void {
    useBanksStore().clearList()
    useAppsStore().clearList()
    useCustomersStore().clearList()
    useBankPaymentsStore().clearList()
    useAppPaymentsStore().clearList()
    useOrdersDataStore().clearAll()
    useBranchesStore().clear()
    useBranchPosSettingsStore().clear()
    useWhatsAppStore().clear()
    useOrdersDraftsStore().activateBranch(branchId)
}
