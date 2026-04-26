import { describe, it, expect, vi } from 'vitest'
import { applyMarkReadySequence } from '../kitchenMarkReadySequence'

describe('applyMarkReadySequence', () => {
    it('llama solo ready cuando ya está en preparación', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const statusById = { 1: 'in_preparation' as const }
        await applyMarkReadySequence(
            [1],
            (id) => statusById[id as 1],
            (id, s) => update(id, s)
        )
        expect(update).toHaveBeenCalledTimes(1)
        expect(update).toHaveBeenCalledWith(1, 'ready')
    })

    it('encadena in_preparation y ready para tomado', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const state = { 2: 'taken' as const }
        await applyMarkReadySequence(
            [2],
            (id) => state[id as 2],
            (id, s) => update(id, s)
        )
        expect(update.mock.calls[0]).toEqual([2, 'in_preparation'])
        expect(update.mock.calls[1]).toEqual([2, 'ready'])
    })

    it('mezcla tomado e in_preparation en un solo batch', async () => {
        const update = vi.fn().mockResolvedValue(undefined)
        const state: Record<number, 'taken' | 'in_preparation'> = { 1: 'taken', 2: 'in_preparation' }
        await applyMarkReadySequence(
            [1, 2],
            (id) => state[id],
            (id, s) => update(id, s)
        )
        expect(update).toHaveBeenCalledTimes(3)
        expect(update.mock.calls[0]).toEqual([1, 'in_preparation'])
        expect(update.mock.calls[1]).toEqual([1, 'ready'])
        expect(update.mock.calls[2]).toEqual([2, 'ready'])
    })
})
