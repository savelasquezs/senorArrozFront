import { describe, expect, it } from 'vitest'
import { KitchenService } from '../KitchenService'
import type { OrderListItem } from '@/types/order'

const order = { id: 7 } as OrderListItem

describe('Kitchen product note announcements', () => {
    it('names the full product and quantity for every note and separates general instructions', () => {
        const products = [
            { name: 'Arroz paisa familiar', quantity: 2, notes: 'Sin cebolla\nSeparar salsa' },
            { name: 'Arroz paisa familiar', quantity: 1, notes: 'Poco picante' },
            { name: 'Papas', quantity: 3, notes: '   ' },
        ]
        const text = KitchenService.generateOrderSpeechText(order, products, 'Empacar todo junto')
        expect(text).toContain('dos Arroz paisa familiar, nota: Sin cebolla Separar salsa.')
        expect(text).toContain('una Arroz paisa familiar, nota: Poco picante.')
        expect(text.match(/Arroz paisa familiar/g)).toHaveLength(2)
        expect(text).toContain('tres Papas.')
        expect(text).not.toContain('Nota para tres Papas')
        expect(text).toContain('Notas generales del pedido: Empacar todo junto')
        expect(KitchenService.generateOrderNotificationText(order, products)).toContain('2x Arroz paisa familiar (Nota: Sin cebolla Separar salsa)')
    })

    it.each([
        [null, 'Sin cebolla', 'Se agregó la nota para dos Arroz familiar: Sin cebolla.'],
        ['Sin cebolla', 'Sin salsa', 'Se cambió la nota para dos Arroz familiar: Sin salsa.'],
        ['Sin cebolla', '', 'Se eliminó la nota para dos Arroz familiar.'],
    ])('announces note changes explicitly: %s -> %s', (previousNotes, notes, expected) => {
        const changes = { lineNoteChanges: [{ productName: 'Arroz familiar', quantity: 2, previousNotes, notes }] }
        const text = KitchenService.buildOrderModifiedSpeechText(7, 'content', changes)
        expect(text).toContain('Modificación del pedido número 7.')
        expect(text).toContain(expected)
        expect(text.match(/Arroz familiar/g)).toHaveLength(1)
        if (previousNotes && previousNotes !== notes) expect(text).not.toContain(previousNotes)
        expect(KitchenService.buildOrderModifiedNotificationBody(7, 'content', changes).usedFallback).toBe(false)
    })

    it('reads notes for added and replaced products without assigning them to other products', () => {
        const text = KitchenService.buildOrderModifiedSpeechText(7, 'content', {
            addedLines: [{ productName: 'Papas grandes', quantity: 2, notes: 'Sin sal' }],
            productReplacements: [{ previousProductName: 'Arroz', newProductName: 'Pollo', newQuantity: 1, newNotes: 'Salsa aparte' }],
        })
        expect(text).toContain('dos Papas grandes, nota: Sin sal.')
        expect(text).toContain('una Pollo, nota: Salsa aparte.')
        expect(text.match(/Papas grandes/g)).toHaveLength(1)
        expect(text.match(/Pollo/g)).toHaveLength(1)
    })

    it('remains compatible with older modification payloads and products without notes', () => {
        expect(KitchenService.generateOrderSpeechText(order, [{ name: 'Arroz', quantity: 1 }])).toBe('Nuevo pedido, una Arroz.')
        expect(KitchenService.buildOrderModifiedSpeechText(7, 'content', {})).toContain('Cambio en el pedido.')
    })
})
