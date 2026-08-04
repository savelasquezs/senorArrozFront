import { beforeEach, describe, expect, it } from 'vitest'
import { __resetDialogsForTests, useDialog } from '@/composables/useDialog'
import {
  parseSettlementAmount,
  requestActualSettlementAmount,
} from '@/helpers/appPaymentSettlement'

describe('appPaymentSettlement', () => {
  beforeEach(() => __resetDialogsForTests())

  it.each([
    ['$ 1.234,50', 1234.5],
    ['1 234', 1234],
    ['0', 0],
  ])('parses supported currency format %s', (input, expected) => {
    expect(parseSettlementAmount(input)).toBe(expected)
  })

  it.each(['', 'texto', '-1', 'Infinity'])(
    'rejects invalid settlement amount %s',
    input => expect(parseSettlementAmount(input)).toBeNull(),
  )

  it('opens the async prompt with context and returns the parsed amount', async () => {
    const dialog = useDialog()
    const result = requestActualSettlementAmount(1234.4, value => `$${value}`, {
      description: 'Vas a liquidar 2 pagos.',
    })

    expect(dialog.activeDialog.value?.type).toBe('prompt')
    expect(dialog.activeDialog.value?.options.message).toContain('Vas a liquidar 2 pagos.')
    expect(dialog.activeDialog.value?.options.defaultValue).toBe('1234')
    dialog.resolveDialog('$ 1.234,50')

    await expect(result).resolves.toBe(1234.5)
  })

  it('returns null when the prompt is cancelled', async () => {
    const dialog = useDialog()
    const result = requestActualSettlementAmount(500, String)
    dialog.cancelDialog()

    await expect(result).resolves.toBeNull()
  })
})
