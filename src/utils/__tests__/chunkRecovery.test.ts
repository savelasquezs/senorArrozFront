import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaleChunkError, recoverFromStaleChunk } from '../chunkRecovery'

describe('chunk recovery', () => {
    beforeEach(() => {
        sessionStorage.clear()
    })
    afterEach(() => vi.restoreAllMocks())

    it('recognizes dynamic import failures from stale deployments', () => {
        expect(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: /assets/Orders-old.js'))).toBe(true)
        expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true)
        expect(isStaleChunkError(new Error('regular API error'))).toBe(false)
    })

    it('reloads once and prevents reload loops inside the cooldown', () => {
        const reload = vi.fn()
        const error = new TypeError('Failed to fetch dynamically imported module')

        expect(recoverFromStaleChunk(error, reload, 100_000)).toBe(true)
        expect(reload).toHaveBeenCalledTimes(1)

        expect(recoverFromStaleChunk(error, reload, 110_000)).toBe(false)
        expect(reload).toHaveBeenCalledTimes(1)
    })

    it('uses an in-memory cooldown when browser storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage denied') })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage denied') })
        const reload = vi.fn()
        expect(recoverFromStaleChunk(undefined, reload, 200_000)).toBe(true)
        expect(recoverFromStaleChunk(undefined, reload, 210_000)).toBe(false)
        expect(reload).toHaveBeenCalledOnce()
    })
})
