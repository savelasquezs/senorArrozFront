import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DialogHost from '@/components/ui/DialogHost.vue'
import { __resetDialogsForTests, useDialog } from '@/composables/useDialog'

describe('DialogHost', () => {
  beforeEach(() => {
    __resetDialogsForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    __resetDialogsForTests()
    document.body.innerHTML = ''
  })

  it('renders a danger confirmation, resolves it, and restores focus', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const wrapper = mount(DialogHost, { attachTo: document.body })
    const { confirmDialog } = useDialog()

    const result = confirmDialog({
      title: 'Eliminar producto',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    })
    await flushPromises()

    expect(document.body.textContent).toContain('Eliminar producto')
    const cancelButton = document.querySelector<HTMLElement>('[data-dialog-cancel]')
    const confirmButton = document.querySelector<HTMLButtonElement>('[data-dialog-confirm]')
    expect(document.activeElement).toBe(cancelButton)
    expect(confirmButton?.className).toContain('bg-red-600')
    confirmButton?.click()

    await expect(result).resolves.toBe(true)
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
  })

  it('processes confirmations in FIFO order', async () => {
    const wrapper = mount(DialogHost, { attachTo: document.body })
    const { confirmDialog } = useDialog()
    const first = confirmDialog({ title: 'Primero', message: 'Primer diálogo' })
    const second = confirmDialog({ title: 'Segundo', message: 'Segundo diálogo' })
    await flushPromises()

    expect(document.body.textContent).toContain('Primero')
    document.querySelector<HTMLButtonElement>('[data-dialog-cancel]')?.click()
    await expect(first).resolves.toBe(false)
    await flushPromises()
    expect(document.body.textContent).toContain('Segundo')
    document.querySelector<HTMLButtonElement>('[data-dialog-confirm]')?.click()
    await expect(second).resolves.toBe(true)
    wrapper.unmount()
  })

  it('keeps an invalid prompt open and resolves a valid value', async () => {
    const wrapper = mount(DialogHost, { attachTo: document.body })
    const { promptDialog } = useDialog()
    const result = promptDialog({
      title: 'Registrar liquidación',
      message: 'Ingresa el valor real.',
      inputLabel: 'Valor real consignado',
      defaultValue: '1000',
      confirmLabel: 'Liquidar',
      validate: value => Number(value) < 0 ? 'El valor no puede ser negativo.' : null,
    })
    await flushPromises()

    const input = document.querySelector<HTMLInputElement>('.global-dialog-host-panel input')!
    expect(document.activeElement).toBe(input)
    input.value = '-1'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector<HTMLButtonElement>('[data-dialog-confirm]')?.click()
    await flushPromises()
    expect(document.body.textContent).toContain('El valor no puede ser negativo.')
    expect(document.body.textContent).toContain('Registrar liquidación')

    input.value = '1250'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector<HTMLButtonElement>('[data-dialog-confirm]')?.click()
    await expect(result).resolves.toBe('1250')
    wrapper.unmount()
  })

  it('cancels a prompt with Escape', async () => {
    const wrapper = mount(DialogHost, { attachTo: document.body })
    const { promptDialog } = useDialog()
    const result = promptDialog({ title: 'Valor', message: 'Ingresa un valor' })
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(result).resolves.toBeNull()
    wrapper.unmount()
  })

  it('cancels a confirmation through the backdrop', async () => {
    const wrapper = mount(DialogHost, { attachTo: document.body })
    const { confirmDialog } = useDialog()
    const result = confirmDialog({ title: 'Confirmar', message: '¿Continuar?' })
    await flushPromises()

    const backdrop = Array.from(document.querySelectorAll<HTMLElement>('div'))
      .find(element => element.classList.contains('bg-black/50'))
    backdrop?.click()

    await expect(result).resolves.toBe(false)
    wrapper.unmount()
  })
})
