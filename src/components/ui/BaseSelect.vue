<!-- src/components/ui/BaseSelect.vue -->
<template>
	<div class="relative" ref="selectRef">
		<label v-if="label" :for="id" :class="labelClass">
			{{ label }}
			<span v-if="required" class="text-red-500">*</span>
		</label>

		<div class="relative" ref="triggerWrapRef">
			<!-- Input/Button -->
			<button type="button" :id="id" @click="toggleDropdown" @keydown.enter.space.prevent="toggleDropdown"
				@keydown.escape="closeDropdown" @keydown.up.prevent="highlightPrevious"
				@keydown.down.prevent="highlightNext" @keydown.enter.prevent="selectHighlighted"
				class="relative w-full text-left bg-white border rounded-md shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:border-green-500 focus:ring-green-500"
				:class="[
					triggerSizeClass,
					error ? 'border-red-300' : 'border-gray-300',
					disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400',
				]" :disabled="disabled" :aria-expanded="isOpen" :aria-haspopup="true">
				<span class="flex items-center min-h-[1.25rem]">
					<slot name="icon" />
					<span class="block truncate" :class="[{ 'text-gray-500': !selectedOption }, textSizeClass]">
						{{ selectedOption ? selectedOption[displayKey] : placeholder }}
					</span>
				</span>
				<span class="absolute inset-y-0 right-0 flex items-center pointer-events-none" :class="chevronPadClass">
					<ChevronUpDownIcon :class="chevronIconClass" class="text-gray-400" />
				</span>
			</button>

			<Teleport :disabled="!teleportDropdown" to="body">
				<Transition name="dropdown">
					<div v-if="isOpen" ref="dropdownPanelRef"
						class="bg-white shadow-lg max-h-60 rounded-md py-1 ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
						:class="[
							teleportDropdown ? 'fixed z-[10000]' : 'absolute z-30 left-0 right-0 w-full mt-1',
							dropdownTextClass,
						]"
						:style="teleportDropdown ? floatingStyle : undefined">
						<!-- Search Input -->
						<div v-if="searchable" :class="searchWrapClass">
							<input ref="searchInput" v-model="searchQuery" type="text"
								:placeholder="`Buscar ${label?.toLowerCase() || 'opción'}...`"
								class="w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
								:class="searchInputClass"
								@keydown.up.prevent="highlightPrevious" @keydown.down.prevent="highlightNext"
								@keydown.enter.prevent="selectHighlighted" @keydown.escape="closeDropdown" />
						</div>

						<!-- Options -->
						<div v-if="filteredOptions.length > 0">
							<div v-for="(option, index) in filteredOptions" :key="option[valueKey]"
								@click="selectOption(option)" @mouseenter="highlightedIndex = index"
								class="relative cursor-pointer select-none hover:bg-gray-50" :class="[
									optionRowClass,
									{
										'bg-green-50 text-green-700': highlightedIndex === index,
										'bg-green-100 text-green-800': isSelected(option),
									},
								]">
								<div class="flex items-center">
									<span class="block truncate" :class="{ 'font-medium': isSelected(option) }">
										{{ option[displayKey] }}
									</span>
									<CheckIcon v-if="isSelected(option)"
										class="absolute inset-y-0 right-0 flex items-center text-green-600"
										:class="size === 'sm' ? 'pr-1 w-4 h-4' : 'pr-2 w-5 h-5'" />
								</div>

								<span v-if="option.description" class="block text-gray-500 truncate" :class="descTextClass">
									{{ option.description }}
								</span>
							</div>
						</div>

						<!-- Create Option -->
						<div v-if="showCreateOption" @click="handleCreateOption"
							@mouseenter="highlightedIndex = filteredOptions.length"
							class="relative cursor-pointer select-none hover:bg-blue-50 border-t border-gray-200"
							:class="[optionRowClass, {
								'bg-blue-50 text-blue-700': highlightedIndex === filteredOptions.length,
							}]">
							<div class="flex items-center">
								<PlusIcon class="text-blue-600 shrink-0" :class="size === 'sm' ? 'w-3.5 h-3.5 mr-1.5' : 'w-4 h-4 mr-2'" />
								<span class="font-medium text-blue-600" :class="size === 'sm' ? 'text-xs' : 'text-sm'">
									Crear "{{ searchQuery }}"
								</span>
							</div>
							<div class="text-blue-500 mt-0.5" :class="size === 'sm' ? 'text-[10px]' : 'text-xs'">
								Haz clic para crear una nueva opción
							</div>
						</div>

						<!-- No options -->
						<div v-else-if="filteredOptions.length === 0"
							class="relative cursor-default select-none text-gray-500" :class="optionRowClass">
							{{
								searchQuery
									? 'No se encontraron resultados'
									: 'No hay opciones disponibles'
							}}
						</div>
					</div>
				</Transition>
			</Teleport>
		</div>

		<p v-if="error" class="mt-1 text-red-600" :class="size === 'sm' ? 'text-xs' : 'text-sm'">{{ error }}</p>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronUpDownIcon, CheckIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface Option {
	[key: string]: any
}

interface Props {
	modelValue: any
	options: Option[]
	valueKey?: string
	displayKey?: string
	label?: string
	placeholder?: string
	required?: boolean
	disabled?: boolean
	searchable?: boolean
	error?: string
	id?: string
	allowCreate?: boolean
	createLabel?: string
	/** Si es true, el panel se renderiza en `body` con posición fija (evita quedar bajo AG Grid u overflow). */
	teleportDropdown?: boolean
	/** `sm`: trigger y lista más compactos. */
	size?: 'md' | 'sm'
}

const props = withDefaults(defineProps<Props>(), {
	valueKey: 'id',
	displayKey: 'name',
	placeholder: 'Seleccionar...',
	searchable: true,
	allowCreate: false,
	createLabel: 'Crear',
	teleportDropdown: false,
	size: 'md',
	id: () => `select-${Math.random().toString(36).substr(2, 9)}`,
})

const labelClass = computed(() =>
	props.size === 'sm'
		? 'block text-xs font-medium text-gray-600 mb-0.5'
		: 'block text-sm font-medium text-gray-700 mb-1',
)

const triggerSizeClass = computed(() =>
	props.size === 'sm' ? 'pl-2 pr-7 py-1.5 text-xs leading-tight' : 'pl-3 pr-10 py-2 sm:text-sm',
)

const textSizeClass = computed(() => (props.size === 'sm' ? 'text-xs' : ''))

const chevronPadClass = computed(() => (props.size === 'sm' ? 'pr-1' : 'pr-2'))

const chevronIconClass = computed(() => (props.size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'))

const dropdownTextClass = computed(() => (props.size === 'sm' ? 'text-xs' : 'sm:text-sm'))

const searchWrapClass = computed(() => (props.size === 'sm' ? 'p-1.5' : 'p-2'))

const searchInputClass = computed(() =>
	props.size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
)

const optionRowClass = computed(() => (props.size === 'sm' ? 'py-1.5 px-2' : 'py-2 px-3'))

const descTextClass = computed(() => (props.size === 'sm' ? 'text-[11px]' : 'text-sm'))

const emit = defineEmits<{
	'update:modelValue': [value: any]
	'create': [value: string]
}>()

const selectRef = ref<HTMLElement>()
const triggerWrapRef = ref<HTMLElement>()
const dropdownPanelRef = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement>()
const isOpen = ref(false)
const searchQuery = ref('')
const highlightedIndex = ref(-1)

const floatingStyle = ref<Record<string, string>>({})

function syncFloatingPosition() {
	if (!props.teleportDropdown || !triggerWrapRef.value) return
	const r = triggerWrapRef.value.getBoundingClientRect()
	const maxH = 240
	const spaceBelow = window.innerHeight - r.bottom - 8
	floatingStyle.value = {
		top: `${r.bottom + 4}px`,
		left: `${r.left}px`,
		width: `${Math.max(r.width, 160)}px`,
		maxHeight: `${Math.min(maxH, Math.max(120, spaceBelow))}px`,
	}
}

function onScrollOrResize() {
	if (isOpen.value && props.teleportDropdown) {
		syncFloatingPosition()
	}
}

const selectedOption = computed(() => {
	if (props.modelValue === null || props.modelValue === undefined) return null
	return (
		props.options.find(
			(option) => option[props.valueKey] === props.modelValue,
		) || null
	)
})

const filteredOptions = computed(() => {
	if (!props.searchable || !searchQuery.value) {
		return props.options
	}

	const query = searchQuery.value.toLowerCase()
	return props.options.filter(
		(option) =>
			option[props.displayKey].toLowerCase().includes(query) ||
			(option.description && option.description.toLowerCase().includes(query)),
	)
})

const showCreateOption = computed(() => {
	if (!props.allowCreate || !props.searchable || !searchQuery.value.trim()) {
		return false
	}

	const exactMatch = props.options.find(option =>
		option[props.displayKey].toLowerCase() === searchQuery.value.toLowerCase(),
	)

	return !exactMatch && searchQuery.value.length >= 2
})

const isSelected = (option: Option) => {
	return option[props.valueKey] === props.modelValue
}

const toggleDropdown = () => {
	if (props.disabled) return
	isOpen.value = !isOpen.value

	if (isOpen.value) {
		nextTick(() => {
			if (props.teleportDropdown) {
				syncFloatingPosition()
			}
			if (props.searchable && searchInput.value) {
				searchInput.value.focus()
			}
		})
	}
}

const closeDropdown = () => {
	isOpen.value = false
	searchQuery.value = ''
	highlightedIndex.value = -1
}

const selectOption = (option: Option) => {
	emit('update:modelValue', option[props.valueKey])
	closeDropdown()
}

const highlightNext = () => {
	const maxIndex = filteredOptions.value.length + (showCreateOption.value ? 1 : 0) - 1
	if (highlightedIndex.value < maxIndex) {
		highlightedIndex.value++
	}
}

const highlightPrevious = () => {
	if (highlightedIndex.value > 0) {
		highlightedIndex.value--
	}
}

const selectHighlighted = () => {
	if (
		highlightedIndex.value >= 0 &&
		highlightedIndex.value < filteredOptions.value.length
	) {
		selectOption(filteredOptions.value[highlightedIndex.value])
	} else if (showCreateOption.value && highlightedIndex.value === filteredOptions.value.length) {
		handleCreateOption()
	}
}

const handleCreateOption = () => {
	emit('create', searchQuery.value)
	closeDropdown()
}

const handleClickOutside = (event: Event) => {
	const t = event.target as Node
	if (selectRef.value?.contains(t)) return
	if (dropdownPanelRef.value?.contains(t)) return
	closeDropdown()
}

watch(isOpen, (newValue) => {
	if (newValue) {
		highlightedIndex.value = filteredOptions.value.findIndex(
			(option) => option[props.valueKey] === props.modelValue,
		)
		if (props.teleportDropdown) {
			nextTick(() => syncFloatingPosition())
			window.addEventListener('scroll', onScrollOrResize, true)
			window.addEventListener('resize', onScrollOrResize)
		}
	} else if (props.teleportDropdown) {
		window.removeEventListener('scroll', onScrollOrResize, true)
		window.removeEventListener('resize', onScrollOrResize)
	}
})

watch(
	() => props.teleportDropdown,
	() => {
		if (isOpen.value && props.teleportDropdown) {
			nextTick(() => syncFloatingPosition())
		}
	},
)

onMounted(() => {
	document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside)
	window.removeEventListener('scroll', onScrollOrResize, true)
	window.removeEventListener('resize', onScrollOrResize)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
	transition: opacity 0.1s ease, transform 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
