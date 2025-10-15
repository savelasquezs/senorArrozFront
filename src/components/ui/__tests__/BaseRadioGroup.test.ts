import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseRadioGroup from '@/components/ui/BaseRadioGroup.vue'

describe('BaseRadioGroup', () => {
    const mockOptions = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
    ]

    it('renders all options correctly', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        expect(wrapper.text()).toContain('Option 1')
        expect(wrapper.text()).toContain('Option 2')
        expect(wrapper.text()).toContain('Option 3')
    })

    it('shows initial selection from modelValue', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option2',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        expect((radioInputs[1].element as HTMLInputElement).checked).toBe(true)
        expect((radioInputs[0].element as HTMLInputElement).checked).toBe(false)
        expect((radioInputs[2].element as HTMLInputElement).checked).toBe(false)
    })

    it('emits update:modelValue when selection changes', async () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        await radioInputs[2].setValue(true)

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option3'])
    })

    it('applies correct size classes for sm', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                size: 'sm'
            }
        })

        const buttons = wrapper.findAll('span.px-3')
        expect(buttons.length).toBe(3)
        expect(buttons[0].classes()).toContain('text-sm')
    })

    it('applies correct size classes for md', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                size: 'md'
            }
        })

        const buttons = wrapper.findAll('span.px-4')
        expect(buttons.length).toBe(3)
        expect(buttons[0].classes()).toContain('text-sm')
    })

    it('applies correct size classes for lg', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                size: 'lg'
            }
        })

        const buttons = wrapper.findAll('span.px-6')
        expect(buttons.length).toBe(3)
        expect(buttons[0].classes()).toContain('text-base')
    })

    it('shows correct visual state for selected option', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option2',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const buttons = wrapper.findAll('span.border')
        expect(buttons[1].classes()).toContain('bg-emerald-600')
        expect(buttons[1].classes()).toContain('text-white')
        expect(buttons[0].classes()).toContain('bg-white')
        expect(buttons[2].classes()).toContain('bg-white')
    })

    it('shows correct visual state for non-selected options', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const buttons = wrapper.findAll('span.border')
        expect(buttons[1].classes()).toContain('bg-white')
        expect(buttons[1].classes()).toContain('text-gray-700')
        expect(buttons[2].classes()).toContain('bg-white')
        expect(buttons[2].classes()).toContain('text-gray-700')
    })

    it('disables all options when disabled prop is true', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                disabled: true
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        radioInputs.forEach(input => {
            expect((input.element as HTMLInputElement).disabled).toBe(true)
        })

        const buttons = wrapper.findAll('span.border')
        buttons.forEach(button => {
            expect(button.classes()).toContain('opacity-50')
            expect(button.classes()).toContain('cursor-not-allowed')
        })
    })

    it('does not emit event when disabled', async () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                disabled: true
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        await radioInputs[1].setValue(true)

        expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('has native radio inputs for accessibility', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        expect(radioInputs.length).toBe(3)

        radioInputs.forEach((input, index) => {
            expect(input.attributes('name')).toBe('test-radio')
            expect(input.attributes('value')).toBe(mockOptions[index].value)
        })
    })

    it('applies fullWidth classes correctly', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                fullWidth: true
            }
        })

        const container = wrapper.find('.inline-flex')
        expect(container.classes()).toContain('w-full')

        const labels = wrapper.findAll('label')
        labels.forEach(label => {
            expect(label.classes()).toContain('flex-1')
        })
    })

    it('applies rounded corners to first option', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const buttons = wrapper.findAll('span.border')
        expect(buttons[0].classes()).toContain('rounded-l-lg')
    })

    it('applies rounded corners to last option', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const buttons = wrapper.findAll('span.border')
        expect(buttons[2].classes()).toContain('rounded-r-lg')
    })

    it('middle options do not have rounded corners', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio'
            }
        })

        const buttons = wrapper.findAll('span.border')
        expect(buttons[1].classes()).not.toContain('rounded-l-lg')
        expect(buttons[1].classes()).not.toContain('rounded-r-lg')
    })

    it('renders label when provided', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                label: 'Choose an option'
            }
        })

        expect(wrapper.text()).toContain('Choose an option')
    })

    it('shows required asterisk when required prop is true', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                label: 'Choose an option',
                required: true
            }
        })

        const asterisk = wrapper.find('.text-red-500')
        expect(asterisk.exists()).toBe(true)
        expect(asterisk.text()).toBe('*')
    })

    it('shows error message when error prop is provided', () => {
        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 'option1',
                options: mockOptions,
                name: 'test-radio',
                error: 'This field is required'
            }
        })

        const errorMsg = wrapper.find('.text-red-600')
        expect(errorMsg.exists()).toBe(true)
        expect(errorMsg.text()).toBe('This field is required')
    })

    it('works with numeric values', async () => {
        const numericOptions = [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
            { value: 3, label: 'Three' }
        ]

        const wrapper = mount(BaseRadioGroup, {
            props: {
                modelValue: 1,
                options: numericOptions,
                name: 'test-radio'
            }
        })

        const radioInputs = wrapper.findAll('input[type="radio"]')
        expect((radioInputs[0].element as HTMLInputElement).checked).toBe(true)

        await radioInputs[2].setValue(true)

        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])
    })
})

