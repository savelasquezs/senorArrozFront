import { ref, toRaw, watch, type Ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useBranchContextStore } from '@/store/branchContext'

const snapshots = new Map<string, unknown>()
let owner = ''

export function useSessionViewState<T>(key: string, initial: T): Ref<T> {
    const auth = useAuthStore(), branch = useBranchContextStore()
    const scope = () => `${auth.user?.id ?? ''}:${auth.userRole}:${branch.revision}`
    if (owner !== scope()) { snapshots.clear(); owner = scope() }
    const saved = auth.user?.id ? snapshots.get(key) as T | undefined : undefined
    const state = ref(structuredClone(saved ?? initial)) as Ref<T>
    watch(state, value => {
        if (!auth.user?.id || owner !== scope()) return
        snapshots.delete(key)
        snapshots.set(key, structuredClone(toRaw(value)))
        if (snapshots.size > 30) snapshots.delete(snapshots.keys().next().value!)
    }, { deep: true, flush: 'sync' })
    watch(scope, () => { snapshots.clear(); owner = scope() }, { flush: 'sync' })
    return state
}
