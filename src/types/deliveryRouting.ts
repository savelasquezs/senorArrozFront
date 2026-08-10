export interface DeliveryRoutingStop {
    orderId: number
    stopSequence: number | null
    type: string
    status: string
    address: string
    additionalInfo: string | null
    neighborhood: string | null
    estimatedReadyAtUtc: string
    estimatedArrivalAtUtc: string | null
    travelFromPreviousSeconds: number
    serviceSeconds: number
    bearingFromBranchDegrees: number
    isReady: boolean
    isSuggestedWait: boolean
    unroutedReason: string | null
}

export interface DeliveryRouteProposal {
    id: number
    sequence: number
    status: string
    recommendation: 'leaveNow' | 'wait' | 'next' | string
    expectedDepartureAtUtc: string
    waitSeconds: number
    approximateDrivingDurationSeconds: number
    approximateDistanceMeters: number
    validatedDrivingDurationSeconds: number | null
    validatedDistanceMeters: number | null
    googleValidationStatus: string
    lastDeliverySeconds: number
    worstAgeAtDeliverySeconds: number
    directionSpreadDegrees: number
    score: number
    isClaimable: boolean
    isFullyReady: boolean
    claimableReadyOrderIds: number[]
    suggestedWaitOrderIds: number[]
    planningWarnings: string | null
    stops: DeliveryRoutingStop[]
}

export interface DeliveryRoutingPlan {
    id: number
    version: number
    status: string
    generatedAtUtc: string
    matrixSource: string
    capacity: { availableNow: number; availableSoon: number }
    solverDurationMs: number
    warnings: string | null
    proposals: DeliveryRouteProposal[]
    unroutedOrders: DeliveryRoutingStop[]
}
