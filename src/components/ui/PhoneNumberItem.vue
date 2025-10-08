<template>
    <div class="flex items-center gap-3">
        <PhoneIcon class="w-4 h-4 text-green-600" />
        <span class="text-sm text-green-800">{{ phoneNumber }}</span>

        <!-- Action Buttons -->
        <div class="flex items-center gap-1 ml-auto">
            <!-- Call Button -->
            <BaseButton @click="makeCall" variant="ghost" size="sm"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" title="Llamar">
                <PhoneIcon class="w-3 h-3" />
            </BaseButton>

            <!-- Copy Button -->
            <BaseButton @click="copyToClipboard" variant="ghost" size="sm"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" :disabled="copyLoading"
                title="Copiar número">
                <ClipboardDocumentIcon v-if="!copyLoading" class="w-3 h-3" />
                <BaseLoading v-else size="sm" />
            </BaseButton>

            <!-- WhatsApp Button -->
            <BaseButton v-if="isValidWhatsAppNumber" @click="openWhatsApp" variant="ghost" size="sm"
                class="text-green-600 hover:text-green-700 hover:bg-green-100" title="Abrir WhatsApp">
                <ChatBubbleLeftRightIcon class="w-3 h-3" />
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
}

const props = defineProps<Props>()

// Composables
const { success, error } = useToast()

// State
const copyLoading = ref(false)

// Computed
const isValidWhatsAppNumber = computed(() => {
    // Check if it's a valid Colombian cell phone number
    // Format: 3XX XXX XXXX or +57 3XX XXX XXXX
    const cleanNumber = props.phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '')

    // Colombian cell numbers start with 3 and have 10 digits total
    // Or international format starting with +57
    const colombianCellPattern = /^(\+57)?3\d{9}$/
    const localPattern = /^3\d{9}$/

    return colombianCellPattern.test(cleanNumber) || localPattern.test(cleanNumber)
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
