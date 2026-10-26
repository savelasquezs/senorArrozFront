import { expect, it } from 'vitest'
import { createLatestRead } from '../latestRead'

it('invalidates and aborts a panel when another selection starts or the panel closes', () => {
    const reads = createLatestRead()
    const first = reads.begin()
    const second = reads.begin()
    expect(first.signal.aborted).toBe(true)
    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)
    reads.invalidate()
    expect(second.signal.aborted).toBe(true)
    expect(second.isCurrent()).toBe(false)
})

it('suppresses an error from an obsolete selection', async () => {
    const reads = createLatestRead()
    let reject!: (cause: Error) => void
    const first = reads.load('a', () => new Promise((_, r) => { reject = r }), () => {})
    let result = ''
    await reads.load('b', async () => 'current', value => { result = value })
    reject(new Error('old failure'))
    await first
    expect(result).toBe('current')
})
