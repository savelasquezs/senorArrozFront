import { BaseApi } from './baseApi'
import type { ApiResponse } from '@/types/common'
import type {
  AiModelLookup,
  AiProviderModelsResult,
  AiTestConnectionResult,
  BranchAiSetting,
  UpsertBranchAiSetting,
} from '@/types/aiSettings'

class BranchAiSettingsApi extends BaseApi {
  getBranchSetting(branchId: number): Promise<ApiResponse<BranchAiSetting>> {
    return this.get<ApiResponse<BranchAiSetting>>(`/branches/${branchId}/ai-settings`)
  }

  saveBranchSetting(branchId: number, payload: UpsertBranchAiSetting): Promise<ApiResponse<BranchAiSetting>> {
    return this.put<ApiResponse<BranchAiSetting>>(`/branches/${branchId}/ai-settings`, payload)
  }

  testBranchConnection(branchId: number): Promise<ApiResponse<AiTestConnectionResult>> {
    // A real provider probe can legitimately take longer than the 10-second
    // default used by the rest of the application.
    return this.post<ApiResponse<AiTestConnectionResult>>(
      `/branches/${branchId}/ai-settings/test-connection`,
      {},
      { timeout: 60_000 },
    )
  }

  getProviderModels(branchId: number, payload: AiModelLookup): Promise<ApiResponse<AiProviderModelsResult>> {
    return this.post<ApiResponse<AiProviderModelsResult>>(`/branches/${branchId}/ai-settings/models`, payload)
  }
  getPromptPreview(branchId: number, payload: UpsertBranchAiSetting): Promise<ApiResponse<{ prompt: string }>> {
    return this.post<ApiResponse<{ prompt: string }>>(`/branches/${branchId}/ai-settings/prompt-preview`, payload)
  }
}

export const branchAiSettingsApi = new BranchAiSettingsApi()
