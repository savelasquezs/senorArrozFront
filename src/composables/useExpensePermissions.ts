import { useAuthStore } from '@/store/auth'
import type { ExpenseHeader } from '@/types/expense'
import { UserRole } from '@/types/auth'
import { defaultBusinessCalendar } from '@/utils/datetime'

export function useExpensePermissions() {
    const authStore = useAuthStore()

    const isSameBusinessDay = (instant: string | Date): boolean =>
        defaultBusinessCalendar.formatYmd(instant) === defaultBusinessCalendar.todayYmd()

    const canAccessExpensesModule = (): boolean => {
        const role = authStore.userRole
        return (
            role === UserRole.SUPERADMIN ||
            role === UserRole.ADMIN ||
            role === UserRole.CASHIER
        )
    }

    const canEditExpense = (expense: Pick<ExpenseHeader, 'createdAt'>): boolean => {
        const role = authStore.userRole
        if (role === UserRole.SUPERADMIN || role === UserRole.ADMIN) return true
        if (role === UserRole.CASHIER) return isSameBusinessDay(expense.createdAt)
        return false
    }

    const canDeleteExpense = (expense: Pick<ExpenseHeader, 'createdAt'>): boolean => {
        return canEditExpense(expense)
    }

    return {
        canAccessExpensesModule,
        canDeleteExpense,
        canEditExpense,
        isSameBusinessDay,
    }
}
