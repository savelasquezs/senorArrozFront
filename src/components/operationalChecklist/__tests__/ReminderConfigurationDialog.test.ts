import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ReminderConfigurationDialog from '../ReminderConfigurationDialog.vue'
import { snapshot } from './fixtures'
const mocks = vi.hoisted(() => ({ configuration: vi.fn(), save: vi.fn(), synchronize: vi.fn(), markDirty: vi.fn(), confirm: vi.fn() }))
vi.mock('@/services/MainAPI/operationalChecklistApi', () => ({ operationalChecklistApi: mocks }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ markDirty: mocks.markDirty }) }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirmDialog: mocks.confirm }) }))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.clearAllMocks()
  mocks.configuration.mockResolvedValue({ items: snapshot().items.map(x => x.reminder) })
  mocks.confirm.mockResolvedValue(true)
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; document.body.innerHTML = '' })
const start = async () => { wrapper = mount(ReminderConfigurationDialog, { props: { modelValue: true, branchId: 1, branchName: 'Sucursal de prueba' }, attachTo: document.body }); await flushPromises(); return wrapper }
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(x => x.textContent?.trim() === name)!
describe('reminder configuration', () => {
  it('loads configuration and sends the expected revision; a docs failure does not lose a saved task', async () => {
    const w = await start()
    document.querySelector<HTMLButtonElement>('[aria-label="Editar Tarea 1"]')!.click(); await flushPromises()
    const name = document.querySelector<HTMLInputElement>('input')!
    name.value = 'Tarea editada'; name.dispatchEvent(new Event('input', { bubbles: true })); await flushPromises()
    mocks.save.mockResolvedValue({ reminder: { ...snapshot().items[0]!.reminder, title: 'Tarea editada' }, documentation: { status: 'pending', message: 'Guardado en el POS. Mintlify está pendiente.' } })
    document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flushPromises()
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, title: 'Tarea editada', expectedRevision: 1 }))
    expect(w.emitted('changed')).toHaveLength(1)
    expect(document.body.textContent).toContain('Mintlify está pendiente')
    expect(document.querySelector('form')).toBeNull()
  })
  it('keeps unsaved edits on a conflict and asks before discarding', async () => {
    const w = await start()
    document.querySelector<HTMLButtonElement>('[aria-label="Editar Tarea 1"]')!.click(); await flushPromises()
    const description = document.querySelector<HTMLTextAreaElement>('textarea')!
    description.value = 'Texto todavía no guardado'; description.dispatchEvent(new Event('input', { bubbles: true })); await flushPromises()
    mocks.save.mockRejectedValue(new Error('La configuración cambió. Recárgala antes de guardar.'))
    document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flushPromises()
    expect(document.body.textContent).toContain('La configuración cambió')
    expect(description.value).toBe('Texto todavía no guardado')
    expect(w.emitted('changed')).toBeUndefined()
    mocks.confirm.mockResolvedValue(false); button('Volver').click(); await flushPromises()
    expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(document.querySelector('form')).not.toBeNull()
    expect(mocks.markDirty).toHaveBeenCalledWith('operational-reminders:1', true)
  })
  it('offers only operating weekdays and keeps new tasks optional through their condition', async () => {
    await start(); button('Nueva tarea').click(); await flushPromises()
    expect([...document.querySelectorAll('button[aria-pressed]')].map(x => x.textContent)).toEqual(['Lun', 'Mar', 'Jue', 'Vie', 'Sáb', 'Dom'])
    expect(document.body.textContent).toContain('Condición (opcional)')
    expect(document.querySelector('form input[type="checkbox"]')).not.toBeNull()
  })
})
