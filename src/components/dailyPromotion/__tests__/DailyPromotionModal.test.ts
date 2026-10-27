import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DailyPromotionModal from '../DailyPromotionModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useProductsStore } from '@/store/products'
import { dailyPromotionApi } from '@/services/MainAPI/dailyPromotionApi'
import { productApi } from '@/services/MainAPI/productApi'
import { productCategoryApi } from '@/services/MainAPI/productCategoryApi'
import { getTodayDailyPromotionWindow } from '@/utils/dailyPromotionWindow'

vi.mock('@/services/MainAPI/dailyPromotionApi', () => ({ dailyPromotionApi: {
  getCurrent: vi.fn(), getActive: vi.fn(), save: vi.fn(), disable: vi.fn(),
} }))
vi.mock('@/services/MainAPI/productApi', () => ({ productApi: { getProducts: vi.fn() } }))
vi.mock('@/services/MainAPI/productCategoryApi', () => ({ productCategoryApi: { getProductCategories: vi.fn() } }))

const product = (id: number, name = `Arroz ${id}`, categoryId = 1) => ({ id, name, categoryId,
  categoryName: '', branchId: 1, price: 10000, active: true, inventoryEnabled: false })
const gift = product(151, 'Papas', 2)
const promotion = (overrides = {}) => ({ id: 1, branchId: 2, type: 'GiftProduct', giftProductId: 151,
  giftProductName: 'Papas', discountProducts: [], minimumOrderValue: 20000, isActive: true, canManage: true, ...overrides })
const page = (items: any[], page = 1, totalPages = 1, totalCount = items.length) => ({ data: { items, page, pageSize: 150, totalPages, totalCount } })
const render = (props = {}) => mount(DailyPromotionModal, {
  props: { modelValue: true, branchId: 2, ...props },
  global: { plugins: [createPinia()], stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>' } } },
})
const select = (wrapper: ReturnType<typeof render>, label: string) => wrapper.findAllComponents(BaseSelect).find(component => component.props('label') === label)!
const input = (wrapper: ReturnType<typeof render>, label: string) => wrapper.findAllComponents(BaseInput).find(component => component.props('label') === label)!
const save = (wrapper: ReturnType<typeof render>) => wrapper.findAll('button').find(button => button.text() === 'Guardar promoción')!

describe('DailyPromotionModal', () => {
  beforeEach(() => {
    vi.mocked(dailyPromotionApi.getCurrent).mockResolvedValue({ data: null } as any)
    vi.mocked(dailyPromotionApi.getActive).mockResolvedValue({ data: null } as any)
    vi.mocked(dailyPromotionApi.save).mockResolvedValue({ data: promotion() } as any)
    vi.mocked(dailyPromotionApi.disable).mockResolvedValue({ data: promotion({ isActive: false }) } as any)
    vi.mocked(productCategoryApi.getProductCategories).mockResolvedValue(page([{ id: 1, name: 'Arroces' }, { id: 2, name: 'Regalos' }]) as any)
    vi.mocked(productApi.getProducts).mockResolvedValue(page([product(1), gift, { ...product(152, 'Inactivo', 2), active: false }]) as any)
  })

  it('loads all catalog pages when opened directly and ignores the administrative list and legacy branch', async () => {
    vi.mocked(productApi.getProducts).mockImplementation(async filters => (Number(filters?.page) === 1
      ? page(Array.from({ length: 150 }, (_, index) => product(index + 1)), 1, 2, 151)
      : page([gift], 2, 2, 151)) as any)
    const wrapper = render()
    await flushPromises()
    expect(useProductsStore().currentProducts).toEqual([])
    expect(select(wrapper, 'Producto de regalo').props('options')).toEqual([{ id: 151, name: 'Papas', categoryName: 'Regalos' }])
    expect(productApi.getProducts).toHaveBeenCalledTimes(2)
    expect(save(wrapper).attributes('disabled')).toBeDefined()
    select(wrapper, 'Producto de regalo').vm.$emit('update:modelValue', 151)
    await flushPromises()
    expect(save(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Papas gratis')
    await save(wrapper).trigger('click'); await flushPromises()
    expect(dailyPromotionApi.save).toHaveBeenCalledWith(2, expect.objectContaining({ giftProductId: 151, ...getTodayDailyPromotionWindow() }))
    wrapper.unmount()
  })

  it('shows a retryable catalog error and preserves the form while retrying', async () => {
    vi.mocked(productApi.getProducts).mockRejectedValueOnce(new Error('Sin conexión'))
    const wrapper = render(); await flushPromises()
    expect(wrapper.text()).toContain('No se pudieron cargar los productos.')
    expect(save(wrapper).attributes('disabled')).toBeDefined()
    input(wrapper, 'Compra mínima ($)').vm.$emit('update:modelValue', 35000)
    await wrapper.findAll('button').find(button => button.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(select(wrapper, 'Producto de regalo').props('options')).toHaveLength(1)
    expect(input(wrapper, 'Compra mínima ($)').props('modelValue')).toBe(35000)
    wrapper.unmount()
  })

  it('distinguishes an empty gifts category and never offers other categories', async () => {
    vi.mocked(productApi.getProducts).mockResolvedValue(page([product(1)]) as any)
    const wrapper = render(); await flushPromises()
    expect(wrapper.text()).toContain('No hay productos activos en Regalos.')
    expect(wrapper.text()).not.toContain('No se pudieron cargar')
    expect(select(wrapper, 'Producto de regalo').props('disabled')).toBe(true)
    expect(save(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('blocks saving a failed configuration load and allows a configuration retry', async () => {
    vi.mocked(dailyPromotionApi.getCurrent).mockRejectedValueOnce(new Error('Sin conexión'))
    const wrapper = render(); await flushPromises()
    expect(wrapper.text()).toContain('No se pudo cargar la promoción.')
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(save(wrapper).attributes('disabled')).toBeDefined()
    vi.mocked(dailyPromotionApi.getCurrent).mockResolvedValue({ data: promotion() } as any)
    await wrapper.findAll('button').find(button => button.text() === 'Reintentar')!.trigger('click'); await flushPromises()
    expect(select(wrapper, 'Producto de regalo').props('modelValue')).toBe(151)
    expect(save(wrapper).attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('uses the active catalog for specific discounts and validates minimum and percentage', async () => {
    const wrapper = render(); await flushPromises()
    select(wrapper, 'Tipo').vm.$emit('update:modelValue', 'PercentageDiscount'); await flushPromises()
    select(wrapper, 'Alcance').vm.$emit('update:modelValue', 'SpecificProducts'); await flushPromises()
    expect(select(wrapper, 'Productos específicos').props('options')).toHaveLength(2)
    input(wrapper, 'Porcentaje').vm.$emit('update:modelValue', 101)
    select(wrapper, 'Productos específicos').vm.$emit('update:modelValue', [1])
    await flushPromises(); expect(save(wrapper).attributes('disabled')).toBeDefined()
    input(wrapper, 'Porcentaje').vm.$emit('update:modelValue', 15)
    input(wrapper, 'Compra mínima ($)').vm.$emit('update:modelValue', -1)
    await flushPromises(); expect(save(wrapper).attributes('disabled')).toBeDefined()
    input(wrapper, 'Compra mínima ($)').vm.$emit('update:modelValue', 0)
    await flushPromises(); expect(save(wrapper).attributes('disabled')).toBeUndefined()
    await save(wrapper).trigger('click'); await flushPromises()
    expect(dailyPromotionApi.save).toHaveBeenCalledWith(2, expect.objectContaining({ type: 'PercentageDiscount', discountPercentage: 15, discountScope: 'SpecificProducts', discountProductIds: [1], giftProductId: null, minimumOrderValue: 0 }))
    wrapper.unmount()
  })

  it('allows free delivery without a catalog and retains inputs after a failed save', async () => {
    vi.mocked(productApi.getProducts).mockRejectedValue(new Error('Sin catálogo'))
    vi.mocked(dailyPromotionApi.save).mockRejectedValueOnce(new Error('No disponible'))
    const wrapper = render(); await flushPromises()
    select(wrapper, 'Tipo').vm.$emit('update:modelValue', 'FreeDelivery'); await flushPromises()
    expect(save(wrapper).attributes('disabled')).toBeUndefined()
    await save(wrapper).trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('No se pudo guardar. Intenta de nuevo.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(select(wrapper, 'Tipo').props('modelValue')).toBe('FreeDelivery')
    await save(wrapper).trigger('click'); await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('ignores late responses after switching branches or closing', async () => {
    let finish!: (response: any) => void
    vi.mocked(dailyPromotionApi.getCurrent).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const wrapper = render(); await flushPromises()
    vi.mocked(dailyPromotionApi.getCurrent).mockResolvedValue({ data: promotion({ branchId: 3, minimumOrderValue: 50000 }) } as any)
    await wrapper.setProps({ branchId: 3 }); await flushPromises()
    finish({ data: promotion({ minimumOrderValue: 10 }) }); await flushPromises()
    expect(input(wrapper, 'Compra mínima ($)').props('modelValue')).toBe(50000)
    await wrapper.setProps({ modelValue: false }); await flushPromises()
    expect(dailyPromotionApi.save).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('preserves read-only permissions and only offers disabling an existing promotion', async () => {
    vi.mocked(dailyPromotionApi.getCurrent).mockResolvedValue({ data: promotion() } as any)
    const wrapper = render({ readonly: true }); await flushPromises()
    expect(wrapper.text()).toContain('Solo lectura')
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button').some(button => button.text() === 'Guardar promoción')).toBe(false)
    expect(wrapper.findAll('button').some(button => button.text() === 'Desactivar')).toBe(false)
    wrapper.unmount()
  })
})
