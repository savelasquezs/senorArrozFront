<template>
    <div class="relative flex items-center" :class="compact ? 'gap-2' : 'gap-3'"
        @mouseenter="phoneHovered = true; phoneDismissed = false" @mouseleave="phoneHovered = false"
        @focusin="phoneFocused = true; phoneDismissed = false" @focusout="onPhoneFocusOut" @keydown.esc.stop="closePhoneActions">
        <PhoneIcon v-if="showIcon" class="w-4 h-4 shrink-0 text-green-600" />
        <button v-if="actionsOnHover" ref="phoneTrigger" type="button" class="min-h-7 whitespace-nowrap rounded text-sm tabular-nums text-emerald-800 underline-offset-2 hover:underline focus-visible:outline-emerald-600"
            :aria-label="`Acciones del teléfono ${phoneNumber}`" :aria-expanded="phoneActionsOpen" :aria-controls="phoneActionsId"
            @click="togglePhoneActions">{{ phoneNumber }}</button>
        <span v-else class="text-sm text-green-800">{{ phoneNumber }}</span>

        <!-- Action Buttons -->
        <div v-if="!actionsOnHover || phoneActionsOpen" :id="phoneActionsId" :class="actionsOnHover ? 'absolute right-0 top-full z-30 pt-1' : 'ml-auto'">
            <div class="flex items-center gap-1" :class="actionsOnHover ? 'rounded-lg border border-gray-200 bg-white p-1 shadow-lg' : ''">
            <!-- Call Button -->
            <BaseButton @click="makeCall" variant="ghost" size="sm" :icon-only="compact || actionsOnHover" :class="compact ? 'h-7 w-7 p-0' : ''"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" :aria-label="`Llamar a ${phoneNumber}`" title="Llamar">
                <PhoneIcon class="w-4 h-4 shrink-0" />
            </BaseButton>

            <!-- Copy Button -->
            <BaseButton @click="copyToClipboard" variant="ghost" size="sm" :icon-only="compact || actionsOnHover" :class="compact ? 'h-7 w-7 p-0' : ''"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" :disabled="copyLoading"
                :aria-label="`Copiar número ${phoneNumber}`" title="Copiar número">
                <ClipboardDocumentIcon v-if="!copyLoading" class="w-4 h-4 shrink-0" />
                <BaseLoading v-else size="sm" />
            </BaseButton>

            <!-- WhatsApp Button -->
            <BaseButton v-if="isValidWhatsAppNumber" @click="openWhatsApp" variant="ghost" size="sm" :icon-only="compact || actionsOnHover" :class="compact ? 'h-7 w-7 p-0' : ''"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" :aria-label="`Abrir WhatsApp de ${phoneNumber}`" title="Abrir WhatsApp">
                <ChatBubbleLeftRightIcon class="w-4 h-4 shrink-0" />
            </BaseButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useToast } from '@/composables/useToast'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'

// Icons
import {
    PhoneIcon,
    ClipboardDocumentIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    phoneNumber: string
    compact?: boolean
    actionsOnHover?: boolean
    showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), { showIcon: true })
const phoneTrigger = ref<HTMLButtonElement | null>(null)
const phoneActionsId = `phone-actions-${useId()}`
const phoneHovered = ref(false)
const phoneFocused = ref(false)
const phonePinned = ref(false)
const phoneDismissed = ref(false)
const phoneActionsOpen = computed(() => !phoneDismissed.value && (phoneHovered.value || phoneFocused.value || phonePinned.value))
function togglePhoneActions() {
    if (phonePinned.value) closePhoneActions()
    else { phonePinned.value = true; phoneDismissed.value = false }
}
function onPhoneFocusOut(event: FocusEvent) {
    if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return
    phoneFocused.value = false
    phonePinned.value = false
}
function closePhoneActions() {
    phoneTrigger.value?.focus()
    phonePinned.value = false
    phoneDismissed.value = true
}

// Composables
const { success, error } = useToast()

// State
const copyLoading = ref(false)

// Computed
const isValidWhatsAppNumber = computed(() => {
    // Check if it's a valid Colombian cell phone number
    // Format: 3XX XXX XXXX or +57 3XX XXX XXXX
    const cleanNumber = props.phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '')

    // Colombian numbers: mobile start with 3, landlines start with 6 (10 digits)
    // Or international format starting with +57
    const colombianIntlPattern = /^(\+57)?[36]\d{9}$/
    const localPattern = /^[36]\d{9}$/

    return colombianIntlPattern.test(cleanNumber) || localPattern.test(cleanNumber)
})

const whatsappNumber = computed(() => {
    if (!isValidWhatsAppNumber.value) return ''

    const cleanNumber = props.phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '')

    // If it starts with +57, use as is
    if (cleanNumber.startsWith('+57')) {
        return cleanNumber
    }

    // If it's a local number starting with 3, add +57
    if (cleanNumber.startsWith('3') && cleanNumber.length === 10) {
        return `+57${cleanNumber}`
    }

    return cleanNumber
})

// Methods
const copyToClipboard = async () => {
    try {
        copyLoading.value = true

        await navigator.clipboard.writeText(props.phoneNumber)
        success('Número copiado', 3000, `El número ${props.phoneNumber} se copió al portapapeles`)
    } catch (err) {
        console.error('Error copying to clipboard:', err)
        error('Error al copiar', 'No se pudo copiar el número al portapapeles')
    } finally {
        copyLoading.value = false
    }
}

const openWhatsApp = () => {
    if (!whatsappNumber.value) return

    const whatsappUrl = `https://wa.me/${whatsappNumber.value.replace('+', '')}`
    window.open(whatsappUrl, '_blank')

    success('WhatsApp abierto', 3000, `Abriendo conversación con ${props.phoneNumber}`)
}

const makeCall = () => {
    // Clean the phone number for tel: protocol
    const cleanNumber = props.phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '')

    // Format for tel: protocol
    let telNumber = cleanNumber

    // If it's a local Colombian number starting with 3, add +57
    if (cleanNumber.startsWith('3') && cleanNumber.length === 10) {
        telNumber = `+57${cleanNumber}`
    }
    // If it doesn't start with +, add it
    else if (!cleanNumber.startsWith('+')) {
        telNumber = `+${cleanNumber}`
    }

    // Create tel: URL
    const telUrl = `tel:${telNumber}`

    // Try to make the call
    try {
        window.location.href = telUrl
        success('Iniciando llamada', 3000, `Llamando a ${props.phoneNumber}`)
    } catch (err) {
        console.error('Error making call:', err)
        error('Error al llamar', 'No se pudo iniciar la llamada')
    }
}
</script>

<style scoped>
/* Custom styles if needed */
</style>
