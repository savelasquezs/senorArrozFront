export type AiSettingStatus =
  | 'not_configured'
  | 'configured_unverified'
  | 'connected'
  | 'inactive'

export type AiProvider = 'openai' | 'gemini'

export interface BranchAiSetting {
  id?: number | null
  branchId: number
  provider: AiProvider | string
  model: string
  apiKeyConfigured: boolean
  apiKeyMasked?: string | null
  isActive: boolean
  temperature?: number | null
  maxContextMessages: number
  lastTestedAt?: string | null
  isVerified: boolean
  createdAt?: string | null
  updatedAt?: string | null
  status: AiSettingStatus
  assistantName: string
  promptObjective: string
  promptPersonality: string
  promptRequiredRules: string
  promptFixedBranchInfo: string
  promptAdditionalInstructions: string
  transferMessage: string
}

export interface UpsertBranchAiSetting {
  provider: AiProvider | string
  model: string
  isActive: boolean
  temperature: number | null
  maxContextMessages: number
  assistantName: string
  promptObjective: string
  promptPersonality: string
  promptRequiredRules: string
  promptFixedBranchInfo: string
  promptAdditionalInstructions: string
  transferMessage: string
}

export interface AiTestConnectionResult {
  success: boolean
  message: string
  setting?: BranchAiSetting | null
}

export interface AiModelLookup {
  provider: AiProvider | string
}

export interface AiProviderModel {
  id: string
  displayName: string
}

export interface AiProviderModelsResult {
  provider: AiProvider | string
  models: AiProviderModel[]
}
