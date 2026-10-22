import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BaseDialog from '../BaseDialog.vue'

describe('Teclado en diálogos compartidos', () => {
    beforeEach(() => vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList))
    afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; document.body.style.overflow = '' })
    it('mantiene Tab y Shift+Tab dentro, cierra con Escape y restaura el foco', async () => {
        const opener = document.createElement('button'); document.body.append(opener); opener.focus()
        const wrapper = mount(BaseDialog, { attachTo: document.body, props: { modelValue: true, title: 'Facturación' }, slots: { default: '<input aria-label="Nombre" /><button id="last">Guardar</button>' } })
        await flushPromises()
        const close = document.querySelector<HTMLButtonElement>('[aria-label="Cerrar diálogo"]')!, last = document.getElementById('last')!
        expect(document.activeElement?.tagName).toBe('INPUT')
        close.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
        expect(document.activeElement).toBe(last)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
        expect(document.activeElement).toBe(close)
        opener.focus(); expect(document.activeElement).toBe(close)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
        await wrapper.setProps({ modelValue: false }); expect(document.activeElement).toBe(opener)
        wrapper.unmount()
    })
    it('Escape solo cierra el diálogo superior y respeta una operación ocupada', async () => {
        const parent = mount(BaseDialog, { attachTo: document.body, props: { modelValue: true, title: 'Pedido' } })
        await flushPromises()
        const child = mount(BaseDialog, { attachTo: document.body, props: { modelValue: true, title: 'Datos', dismissible: false } })
        await flushPromises()
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        expect(child.emitted('update:modelValue')).toBeUndefined(); expect(parent.emitted('update:modelValue')).toBeUndefined()
        await child.setProps({ dismissible: true })
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        expect(child.emitted('update:modelValue')).toHaveLength(1); expect(parent.emitted('update:modelValue')).toBeUndefined()
        child.unmount(); parent.unmount()
    })
})
