/** Opciones de vuelto alineadas con DeliveryAdvanceVueltoHelper en backend. */
export interface VueltoOption {
  vueltoAdd: number
  targetCarry: number
}

export function getDeliveryAdvanceVueltoOptions(totalCop: number): VueltoOption[] {
  if (totalCop <= 0) return []
  const T = totalCop
  if (T % 100_000 === 0) return [{ vueltoAdd: 0, targetCarry: T }]
  if (T % 50_000 === 0) {
    const h100 = Math.ceil(T / 100_000) * 100_000
    return [{ vueltoAdd: h100 - T, targetCarry: h100 }]
  }
  const q = Math.floor((T % 100_000) / 10_000)
  const list: VueltoOption[] = []
  if (q < 5) {
    const h50 = Math.ceil(T / 50_000) * 50_000
    if (h50 > T) list.push({ vueltoAdd: h50 - T, targetCarry: h50 })
  }
  const h100 = Math.ceil(T / 100_000) * 100_000
  if (h100 > T) list.push({ vueltoAdd: h100 - T, targetCarry: h100 })
  const byTarget = new Map<number, VueltoOption>()
  for (const o of list) byTarget.set(o.targetCarry, o)
  return [...byTarget.values()].sort((a, b) => a.targetCarry - b.targetCarry)
}
