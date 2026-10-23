import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isDashboardSectionId, type DashboardSectionId } from '@/views/dashboard/dashboardSectionIds'

export function useDashboardSection() {
  const route = useRoute()
  const router = useRouter()
  return computed<DashboardSectionId>({
    get: () => typeof route.query.section === 'string' && isDashboardSectionId(route.query.section)
      ? route.query.section : 'principal',
    set: section => {
      void router.replace({ query: { ...route.query, section: section === 'principal' ? undefined : section } })
    },
  })
}
