import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BranchAiSettingsForm from '@/components/branches/BranchAiSettingsForm.vue'

const api = vi.hoisted(() => ({
  getBranchSetting: vi.fn(), saveBranchSetting: vi.fn(), getProviderModels: vi.fn(),
  getPromptPreview: vi.fn(), testBranchConnection: vi.fn(),
}))
vi.mock('@/services/MainAPI/branchAiSettingsApi', () => ({ branchAiSettingsApi: api }))

const setting = (contextStrategy?: 'legacy'|'optimized_v1') => ({
  id:1,branchId:1,provider:'openai',model:'gpt-test',apiKeyConfigured:false,isActive:false,
  isVerified:false,temperature:null,maxContextMessages:20,contextStrategy,
  assistantName:'',promptObjective:'',promptPersonality:'',promptRequiredRules:'',
  promptFixedBranchInfo:'',promptAdditionalInstructions:'',transferMessage:'',
})
const mountForm = () => mount(BranchAiSettingsForm,{props:{branchId:1},global:{stubs:{
  BaseCard:{template:'<div><slot /></div>'},BaseBadge:{template:'<span><slot /></span>'},
  BaseAlert:{template:'<div><slot /></div>'},BaseLoading:{template:'<div>loading</div>'},
  BaseButton:{template:'<button><slot /></button>'},BaseInput:{template:'<input />'},
  BaseSelect:{template:'<select />'},
}}})

describe('BranchAiSettingsForm context strategy',()=>{
  beforeEach(()=>vi.clearAllMocks())
  it('defaults old responses to legacy',async()=>{api.getBranchSetting.mockResolvedValueOnce({data:setting()});const w=mountForm();await flushPromises();expect((w.find('#context-strategy').element as HTMLSelectElement).value).toBe('legacy')})
  it('loads optimized_v1',async()=>{api.getBranchSetting.mockResolvedValueOnce({data:setting('optimized_v1')});const w=mountForm();await flushPromises();expect((w.find('#context-strategy').element as HTMLSelectElement).value).toBe('optimized_v1')})
  it('saves the selected strategy',async()=>{api.getBranchSetting.mockResolvedValueOnce({data:setting('legacy')});api.saveBranchSetting.mockImplementation((_branch,payload)=>Promise.resolve({data:{...setting(payload.contextStrategy),...payload}}));const w=mountForm();await flushPromises();await w.find('#context-strategy').setValue('optimized_v1');await w.find('form').trigger('submit');await flushPromises();expect(api.saveBranchSetting).toHaveBeenCalledWith(1,expect.objectContaining({contextStrategy:'optimized_v1'}))})
})
