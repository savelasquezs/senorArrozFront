import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { branchApi } from '@/services/MainAPI/branchApi'
import {
    clearSelectedBranchIdForRequest,
    setSelectedBranchIdForRequest,
} from '@/services/branchContextSession'
import { UserRole, type User } from '@/types/auth'
import { useDialog } from '@/composables/useDialog'

export interface BranchOption {
    id: number
    name: string
}

const storageKey = (userId: number) => `senor-arroz:selected-branch:${userId}`

export const useBranchContextStore = defineStore('branchContext', () => {
    const { confirmDialog } = useDialog()
    const options = ref<BranchOption[]>([])
    const selectedBranchId = ref<number | null>(null)
    const initializedUserId = ref<number | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const revision = ref(0)
    const dirtySources = ref<Set<string>>(new Set())

    const selectedBranch = computed(
        () => options.value.find(branch => branch.id === selectedBranchId.value) ?? null,
    )
    const hasBranches = computed(() => options.value.length > 0)
    const isInitialized = computed(() => initializedUserId.value != null)
    const hasDirtyForms = computed(() => dirtySources.value.size > 0)

    function readStoredBranch(userId: number): number | null {
        const value = Number(localStorage.getItem(storageKey(userId)))
        return Number.isInteger(value) && value > 0 ? value : null
    }

    function persist(userId: number, branchId: number | null) {
        if (branchId == null) {
            localStorage.removeItem(storageKey(userId))
            return
        }
        localStorage.setItem(storageKey(userId), String(branchId))
    }

    function applySelection(user: User, branchId: number | null, bumpRevision = false) {
        selectedBranchId.value = branchId
        persist(user.id, branchId)
        if (user.role === UserRole.SUPERADMIN) {
            setSelectedBranchIdForRequest(branchId)
        } else {
            clearSelectedBranchIdForRequest()
        }
        if (bumpRevision) revision.value++
    }

    async function initializeForUser(user: User, force = false) {
        if (!force && initializedUserId.value === user.id) return

        isLoading.value = true
        error.value = null
        try {
            if (user.role !== UserRole.SUPERADMIN) {
                options.value = user.branchId
                    ? [{ id: user.branchId, name: user.branchName || `Sucursal ${user.branchId}` }]
                    : []
                selectedBranchId.value = user.branchId || null
                clearSelectedBranchIdForRequest()
                initializedUserId.value = user.id
                return
            }

            const response = await branchApi.getBranchOptions()
            options.value = [...(response.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))

            const stored = readStoredBranch(user.id)
            const fallbackIds = [stored, user.branchId, options.value[0]?.id]
            const next =
                fallbackIds.find(
                    (candidate): candidate is number =>
                        !!candidate && options.value.some(branch => branch.id === candidate),
                ) ?? null

            applySelection(user, next)
            initializedUserId.value = user.id
        } catch (cause: any) {
            error.value = cause?.message || 'No se pudieron cargar las sucursales'
            options.value = []
            selectedBranchId.value = null
            clearSelectedBranchIdForRequest()
            initializedUserId.value = user.id
            throw cause
        } finally {
            isLoading.value = false
        }
    }

    async function refreshOptions(user: User) {
        const previous = selectedBranchId.value
        await initializeForUser(user, true)
        if (previous && options.value.some(branch => branch.id === previous)) {
            applySelection(user, previous)
        }
    }

    async function selectBranch(user: User, branchId: number, options?: { force?: boolean }): Promise<boolean> {
        if (!Number.isInteger(branchId) || !hasBranch(branchId)) return false
        if (selectedBranchId.value === branchId) return true

        if (
            !options?.force
            && hasDirtyForms.value
            && !(await confirmDialog({
                title: 'Descartar cambios sin guardar',
                message: 'Hay cambios sin guardar. ¿Deseas cambiar de sucursal y descartarlos?',
                confirmLabel: 'Descartar y cambiar',
                tone: 'warning',
            }))
        ) {
            return false
        }

        dirtySources.value.clear()
        applySelection(user, branchId, true)
        return true
    }

    function hasBranch(branchId: number) {
        return options.value.some(branch => branch.id === branchId)
    }

    function markDirty(source: string, dirty: boolean) {
        const next = new Set(dirtySources.value)
        if (dirty) next.add(source)
        else next.delete(source)
        dirtySources.value = next
    }

    function reset() {
        options.value = []
        selectedBranchId.value = null
        initializedUserId.value = null
        isLoading.value = false
        error.value = null
        dirtySources.value.clear()
        revision.value++
        clearSelectedBranchIdForRequest()
    }

    return {
        options,
        selectedBranchId,
        selectedBranch,
        initializedUserId,
        isLoading,
        error,
        revision,
        hasBranches,
        isInitialized,
        hasDirtyForms,
        initializeForUser,
        refreshOptions,
        selectBranch,
        hasBranch,
        markDirty,
        reset,
    }
})
