import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BranchAiSettingsForm from '@/components/branches/BranchAiSettingsForm.vue'

const api = vi.hoisted(() => ({ getBranchSetting:vi.fn(),saveBranchSetting:vi.fn(),getProviderModels:vi.fn(),getPromptPreview:vi.fn(),testBranchConnection:vi.fn() }))
vi.mock('@/services/MainAPI/branchAiSettingsApi',()=>({branchAiSettingsApi:api}))

it('shows Simple v1 and never sends a context strategy',async()=>{
  api.getBranchSetting.mockResolvedValue({data:{id:1,branchId:1,provider:'openai',model:'gpt-test',apiKeyConfigured:false,isActive:false,isVerified:false,temperature:null,maxContextMessages:20,assistantName:'',promptObjective:'',promptPersonality:'',promptRequiredRules:'',promptFixedBranchInfo:'',promptAdditionalInstructions:'',transferMessage:''}})
  api.saveBranchSetting.mockImplementation((_branch,payload)=>Promise.resolve({data:payload}))
  const wrapper=mount(BranchAiSettingsForm,{props:{branchId:1},global:{stubs:{BaseCard:{template:'<div><slot /></div>'},BaseBadge:{template:'<span><slot /></span>'},BaseAlert:{template:'<div><slot /></div>'},BaseLoading:{template:'<div>loading</div>'},BaseButton:{template:'<button><slot /></button>'},BaseInput:{template:'<input />'},BaseSelect:{template:'<select />'}}}})
  await flushPromises();expect(wrapper.text()).toContain('Arquitectura del agente: Simple v1');expect(wrapper.find('#context-strategy').exists()).toBe(false)
  await wrapper.find('form').trigger('submit');await flushPromises();expect(api.saveBranchSetting.mock.calls[0]?.[1]).not.toHaveProperty('contextStrategy')
})
