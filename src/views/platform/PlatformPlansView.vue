<template>
  <section>
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="eyebrow">Catalogo comercial</p><h2 class="mt-2 text-3xl font-semibold">Planes y versiones</h2><p class="mt-2 text-slate-400">Las versiones publicadas son inmutables.</p></div><button class="primary" @click="showPlanForm = !showPlanForm">Nuevo plan</button></header>
    <form v-if="showPlanForm" class="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:grid-cols-3" @submit.prevent="createPlan"><input v-model="newPlan.code" required pattern="[a-z0-9_-]+" placeholder="codigo_estable" class="field" /><input v-model="newPlan.name" required placeholder="Nombre" class="field" /><input v-model="newPlan.description" required placeholder="Descripcion" class="field" /><button class="primary md:col-span-3">Crear plan</button></form>
    <div class="grid gap-6 xl:grid-cols-3">
      <article v-for="plan in plans" :key="plan.id" class="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 class="text-xl font-semibold">{{ plan.name }}</h3><p class="mt-2 text-sm text-slate-400">{{ plan.description }}</p><button class="primary mt-5 py-2 text-sm" @click="newVersion(plan)">Nueva version</button>
        <div v-for="version in plan.versions" :key="version.id" class="mt-4 rounded-xl bg-slate-950/60 p-4"><div class="flex justify-between"><strong>v{{ version.versionNumber }}</strong><span class="capitalize text-slate-400">{{ version.status }}</span></div><p class="mt-2 text-xs text-slate-400">{{ version.branchLimit ?? '∞' }} sucursales · {{ version.userLimit ?? '∞' }} usuarios · {{ version.modules.length }} modulos</p><p class="mt-1 text-xs text-slate-400">{{ version.monthlyPrice ?? 'Sin precio' }} {{ version.currency }}/mes · {{ version.annualPrice ?? 'Sin precio anual' }}</p><div class="mt-3 flex gap-4"><button v-if="version.status === 'draft'" class="text-sm text-slate-300" @click="editVersion(plan, version)">Editar</button><button v-if="version.status === 'draft'" class="text-sm text-amber-300" @click="publish(version.id)">Publicar</button><button v-if="version.status === 'published'" class="text-sm text-slate-300" @click="retire(version.id)">Retirar</button></div></div>
      </article>
    </div>

    <div v-if="editingPlan" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-5">
      <form class="w-full max-w-3xl rounded-3xl bg-slate-900 p-7" @submit.prevent="saveVersion"><h3 class="text-xl font-semibold">{{ editingVersionId ? 'Editar borrador' : 'Nueva version' }} de {{ editingPlan.name }}</h3><div class="mt-5 grid gap-4 sm:grid-cols-2"><input v-model="draft.currency" required maxlength="3" class="field" placeholder="Moneda" /><input v-model.number="draft.monthlyPrice" type="number" min="0" class="field" placeholder="Precio mensual opcional" /><input v-model.number="draft.annualPrice" type="number" min="0" class="field" placeholder="Precio anual opcional" /><input v-model.number="draft.branchLimit" type="number" min="1" class="field" placeholder="Limite sucursales; vacio ilimitado" /><input v-model.number="draft.userLimit" type="number" min="1" class="field" placeholder="Limite usuarios; vacio ilimitado" /></div><div class="mt-5 grid gap-2 sm:grid-cols-2"><label v-for="module in modules" :key="module.code" class="flex gap-2 rounded-lg bg-white/5 p-3 text-sm"><input v-model="draft.modules" type="checkbox" :value="module.code" />{{ module.name }}</label></div><p v-if="error" class="mt-4 text-red-300">{{ error }}</p><div class="mt-6 flex justify-end gap-3"><button type="button" class="action" @click="closeEditor">Cancelar</button><button class="primary">Guardar borrador</button></div></form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { platformApi } from '@/services/platformApi'
import type { CatalogItem, Plan, PlanVersion } from '@/types/saas'

const plans = ref<Plan[]>([])
const modules = ref<CatalogItem[]>([])
const editingPlan = ref<Plan | null>(null)
const editingVersionId = ref<number | null>(null)
const showPlanForm = ref(false)
const error = ref('')
const newPlan = reactive({ code: '', name: '', description: '' })
const draft = reactive({ currency: 'COP', monthlyPrice: null as number | null, annualPrice: null as number | null, branchLimit: null as number | null, userLimit: null as number | null, modules: [] as string[] })

async function load() { plans.value = await platformApi.plans() }
function resetDraft() { draft.currency = 'COP'; draft.monthlyPrice = null; draft.annualPrice = null; draft.branchLimit = null; draft.userLimit = null; draft.modules = [] }
function newVersion(plan: Plan) { editingPlan.value = plan; editingVersionId.value = null; resetDraft() }
function editVersion(plan: Plan, version: PlanVersion) { editingPlan.value = plan; editingVersionId.value = version.id; Object.assign(draft, { currency: version.currency, monthlyPrice: version.monthlyPrice, annualPrice: version.annualPrice, branchLimit: version.branchLimit, userLimit: version.userLimit, modules: [...version.modules] }) }
function closeEditor() { editingPlan.value = null; editingVersionId.value = null }
async function createPlan() { await platformApi.createPlan(newPlan); Object.assign(newPlan, { code: '', name: '', description: '' }); showPlanForm.value = false; await load() }
async function saveVersion() { if (!editingPlan.value) return; error.value = ''; try { if (editingVersionId.value) await platformApi.updateVersion(editingVersionId.value, draft); else await platformApi.createVersion(editingPlan.value.id, draft); closeEditor(); await load() } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No fue posible guardar' } }
async function publish(id: number) { await platformApi.publishVersion(id); await load() }
async function retire(id: number) { await platformApi.retireVersion(id); await load() }

onMounted(async () => { modules.value = await platformApi.modules(); await load() })
</script>

<style scoped>
.field{width:100%;border:1px solid rgb(255 255 255/.1);border-radius:.75rem;background:#0f172a;padding:.75rem 1rem;outline:none}.primary{border-radius:.75rem;background:#fbbf24;padding:.75rem 1.25rem;font-weight:600;color:#020617}.action{border-radius:.75rem;background:rgb(255 255 255/.1);padding:.75rem 1.25rem}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.25em;color:#fcd34d}
</style>
