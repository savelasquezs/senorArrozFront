export const WHATSAPP_AWAY_MESSAGE_MAX_LENGTH = 3500

export const DEFAULT_WHATSAPP_AWAY_MESSAGE =
  '¡Hola! Gracias por escribir a {{BranchName}}. En este momento estamos fuera de nuestro horario de atención. Volvemos a atender {{NextOpening}}. Tu mensaje quedó registrado y lo revisaremos cuando abramos.'

const allowedVariables = new Set(['branchname', 'nextopening'])
const variablePattern = /{{\s*([a-zA-Z0-9_]+)\s*}}/g

export function validateWhatsAppAwayMessage(template: string): string | null {
  if (!template.trim()) return 'Escribe el mensaje de ausencia antes de activarlo.'
  if (template.length > WHATSAPP_AWAY_MESSAGE_MAX_LENGTH) {
    return `El mensaje de ausencia no puede superar ${WHATSAPP_AWAY_MESSAGE_MAX_LENGTH} caracteres.`
  }

  const matches = [...template.matchAll(variablePattern)]
  const unknown = matches.find((match) => !allowedVariables.has(match[1].toLowerCase()))
  if (unknown) return `La variable {{${unknown[1]}}} no está disponible.`

  const withoutKnownVariables = template.replace(variablePattern, '')
  if (withoutKnownVariables.includes('{{') || withoutKnownVariables.includes('}}')) {
    return 'El mensaje de ausencia contiene una variable incompleta.'
  }
  return null
}
