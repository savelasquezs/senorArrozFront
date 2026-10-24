export interface DeliveryPerformanceSummary {
  assignedCount?: number
  pendingCount?: number
  onTheWayCount?: number
  routesCount?: number
  inProgressRoutesCount?: number
  returnPendingRoutesCount?: number
  inconsistentReturnCount?: number
  deliveredCount: number
  completedRoutesCount: number
  slaSampleCount: number
  routeSampleCount: number
  orderSampleCount: number
  gpsSampleCount: number
  distanceSampleCount?: number
  estimatedDistanceSampleCount?: number
  stageSampleCount: number
  onTimePercent: number | null
  avgRouteMinutes: number | null
  avgMetaMinutes: number | null
  avgOrderMinutes: number | null
  p90OrderMinutes: number | null
  minutesPerKm: number | null
  gpsMinutesPerKm?: number | null
  estimatedMinutesPerKm?: number | null
  ordersPerRoute: number | null
  avgDispatchMinutes: number | null
  avgDeliveryStageMinutes: number | null
  avgReturnMinutes: number | null
  totalGpsKm: number
}

export interface DeliveryPerformanceDriver extends DeliveryPerformanceSummary {
  id: number
  name: string
  branchId: number
}

export type DeliveryRouteStatus = 'completed' | 'inProgress' | 'returnPending'

export interface DeliveryPerformanceRoute {
  status?: DeliveryRouteStatus
  startedAtUtc?: string | null
  pendingOrdersCount?: number
  returnIsInconsistent?: boolean
  id: number
  deliverymanId: number
  deliverymanName: string
  branchName: string
  departedAtUtc: string | null
  completedAtUtc: string | null
  deliveredCount: number
  durationMinutes: number | null
  metaMinutes: number | null
  metSla: boolean | null
  gpsDistanceKm: number | null
  plannedDistanceKm: number
  gpsCoveragePercent: number
}

export interface DeliveryPerformance {
  team?: DeliveryPerformanceSummary | null
  teamEvolution?: DeliveryPerformanceSummary[]
  current: DeliveryPerformanceSummary
  previous: DeliveryPerformanceSummary
  drivers: DeliveryPerformanceDriver[]
  driverOptions: DeliveryPerformanceDriver[]
  labels: string[]
  evolution: DeliveryPerformanceSummary[]
  recentRoutes: DeliveryPerformanceRoute[]
}

export interface DeliveryRouteDetail {
  status?: DeliveryRouteStatus
  startedAtUtc?: string | null
  returnIsInconsistent?: boolean
  routeId: number
  branchLatitude: number | null
  branchLongitude: number | null
  departedAtUtc: string | null
  completedAtUtc: string | null
  gpsCoveragePercent: number
  segments: Array<Array<{ latitude: number; longitude: number; recordedAt: string }>>
  stops: Array<{
    isPending?: boolean
    isOnTheWay?: boolean
    orderId: number
    stopSequence: number
    addressSnapshotText: string | null
    customerName: string | null
    addressText: string | null
    latitude: number | null
    longitude: number | null
    deliveredAtUtc: string | null
    onTheWayAtUtc?: string | null
  }>
}
