<template>
  <section>
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p class="eyebrow">Directorio B2B</p><h2 class="mt-2 text-3xl font-semibold">Clientes</h2><p class="mt-2 text-slate-400">Tenants, suscripciones, uso y estado operativo.</p></div>
      <button class="primary" @click="showCreate = !showCreate">{{ showCreate ? 'Cerrar alta' : 'Nuevo cliente' }}</button>
    </header>

    <form v-if="showCreate" class="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:grid-cols-3" @submit.prevent="createTenant">
      <h3 class="text-lg font-semibold md:col-span-3">Alta guiada</h3>
      <input v-model="form.name" required placeholder="Nombre comercial" class="field" />
      <input v-model="form.slug" required placeholder="slug-unico" class="field" />
      <input v-model="form.contactName" required placeholder="Contacto" class="field" />
      <input v-model="form.contactEmail" required type="email" placeholder="Correo contacto" class="field" />
      <input v-model="form.contactPhone" placeholder="Telefono contacto" class="field" />
      <select v-model.number="form.planVersionId" required class="field"><option :value="0" disabled>Plan publicado</option><option v-for="option in planOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select>
      <input v-model="form.branchName" required placeholder="Sucursal inicial" class="field" />
      <input v-model="form.branchAddress" required placeholder="Direccion sucursal" class="field" />
      <input v-model="form.branchPhone" required placeholder="Telefono sucursal" class="field" />
      <input v-model="form.adminName" required placeholder="Primer Superadmin" class="field" />
      <input v-model="form.adminEmail" required type="email" placeholder="Correo administrador" class="field" />
      <input v-model="form.adminPhone" required placeholder="Telefono administrador" class="field" />
      <div class="flex flex-wrap gap-4 md:col-span-3"><label v-for="addon in addons" :key="addon.code" class="flex gap-2 text-sm"><input v-model="form.addons" type="checkbox" :value="addon.code" />{{ addon.name }}</label></div>
      <p v-if="error" class="text-sm text-red-300 md:col-span-3">{{ error }}</p>
      <button class="primary md:col-span-3">Crear borrador y enviar invitacion</button>
    </form>

    <div class="mb-5 flex gap-3">
      <input v-model="search" placeholder="Buscar por nombre, slug o correo" class="field max-w-xl" @input="load" />
      <select v-model="status" class="field max-w-52" @change="load"><option value="">Todos los estados</option><option value="active">Activo</option><option value="draft">Borrador</option><option value="suspended">Suspendido</option><option value="cancelled">Cancelado</option></select>
    </div>
    <div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <table class="w-full text-left text-sm"><thead class="bg-white/5 text-slate-400"><tr><th class="p-4">Cliente</th><th class="p-4">Plan</th><th class="p-4">Uso</th><th class="p-4">Estado</th></tr></thead><tbody><tr v-for="tenant in tenants" :key="tenant.id" class="cursor-pointer border-t border-white/10 hover:bg-white/5" @click="open(tenant.id)"><td class="p-4"><strong>{{ tenant.name }}</strong><p class="text-xs text-slate-400">{{ tenant.slug }} · {{ tenant.contactEmail }}</p></td><td class="p-4">{{ tenant.planName }}</td><td class="p-4">{{ tenant.branchCount }} suc. · {{ tenant.userCount }} usuarios</td><td class="p-4"><span class="rounded-full bg-white/10 px-3 py-1 capitalize">{{ tenant.status }}</span></td></tr></tbody></table>
    </div>

    <div v-if="selected" class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-5 backdrop-blur" @click.self="selected = null">
      <section class="ml-auto min-h-full w-full max-w-3xl rounded-3xl bg-slate-900 p-7 shadow-2xl">
        <button class="float-right text-slate-400" @click="selected = null">Cerrar</button>
        <h3 class="text-2xl font-semibold">{{ selected.name }}</h3><p class="mt-1 text-slate-400">{{ selected.slug }} · {{ selected.publicId }}</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-3"><div class="metric"><small>Plan</small><strong>v{{ selected.plan.versionNumber }}</strong></div><div class="metric"><small>Sucursales</small><strong>{{ selected.branches.length }} / {{ selected.plan.branchLimit ?? '∞' }}</strong></div><div class="metric"><small>Usuarios</small><strong>{{ selected.users.length }} / {{ selected.plan.userLimit ?? '∞' }}</strong></div></div>
        <div class="mt-5 flex gap-3"><select v-model.number="selectedPlanVersionId" class="field"><option v-for="option in planOptions" :key="option.id" :value="option.id">{{ option.label }}</option></select><button class="action shrink-0" :disabled="selectedPlanVersionId === selected.plan.id" @click="changePlan">Cambiar plan</button></div>
        <div class="mt-6 flex flex-wrap gap-3"><button v-if="selected.status !== 'active' && selected.status !== 'cancelled'" class="action" @click="statusChange('active')">Activar</button><button v-if="selected.status === 'active'" class="action text-red-200" @click="statusChange('suspended')">Suspender</button><button v-if="selected.status !== 'cancelled'" class="action text-red-300" @click="statusChange('cancelled')">Cancelar cliente</button><button class="action" @click="resend">Reenviar invitacion</button></div>
        <h4 class="section-title">Add-ons</h4><label v-for="addon in addons" :key="addon.code" class="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-4"><span>{{ addon.name }}</span><input type="checkbox" :checked="selected.addons.includes(addon.code)" @change="toggleAddon(addon.code, ($event.target as HTMLInputElement).checked)" /></label>
        <h4 class="section-title">Uso mensual medido</h4><div class="mt-3 grid gap-3 sm:grid-cols-4"><div class="metric"><small>Pedidos</small><strong>{{ selected.usage.orders }}</strong></div><div class="metric"><small>Almacenamiento</small><strong>{{ formatBytes(selected.usage.storageBytes) }}</strong></div><div class="metric"><small>Tokens IA</small><strong>{{ selected.usage.aiInputTokens + selected.usage.aiOutputTokens }}</strong></div><div class="metric"><small>Costo IA</small><strong>USD {{ selected.usage.aiEstimatedCostUsd.toFixed(4) }}</strong></div></div>
        <h4 class="section-title">Sucursales</h4><div class="mt-3 overflow-hidden rounded-xl border border-white/10"><div v-for="branch in selected.branches" :key="branch.id" class="border-b border-white/10 p-4 last:border-0"><strong>{{ branch.name }}</strong><p class="text-sm text-slate-400">{{ branch.address }}</p></div></div>
        <h4 class="section-title">Usuarios</h4><div class="mt-3 overflow-hidden rounded-xl border border-white/10"><div v-for="user in selected.users" :key="user.id" class="flex justify-between border-b border-white/10 p-4 last:border-0"><div><strong>{{ user.name }}</strong><p class="text-sm text-slate-400">{{ user.email }}</p></div><span class="text-sm text-slate-300">{{ user.role }} · {{ user.active ? 'Activo' : 'Inactivo' }}</span></div></div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { platformApi } from '@/services/platformApi'
import type { CatalogItem, CreateTenantPayload, Plan, TenantDetail, TenantListItem } from '@/types/saas'

const tenants = ref<TenantListItem[]>([])
const plans = ref<Plan[]>([])
const addons = ref<CatalogItem[]>([])
const selected = ref<TenantDetail | null>(null)
const selectedPlanVersionId = ref(0)
const search = ref('')
const status = ref('')
const error = ref('')
const showCreate = ref(false)
const form = reactive<CreateTenantPayload>({ name: '', slug: '', contactName: '', contactEmail: '', contactPhone: '', planVersionId: 0, branchName: '', branchAddress: '', branchPhone: '', adminName: '', adminEmail: '', adminPhone: '', addons: [] })
const planOptions = computed(() => plans.value.flatMap(plan => plan.versions.filter(version => version.status === 'published').map(version => ({ id: version.id, label: `${plan.name} v${version.versionNumber}` }))))

async function load() { tenants.value = await platformApi.tenants(search.value, status.value) }
async function open(id: number) { selected.value = await platformApi.tenant(id); selectedPlanVersionId.value = selected.value.plan.id }
async function createTenant() { error.value = ''; try { await platformApi.createTenant(form); showCreate.value = false; await load() } catch (cause) { error.value = cause instanceof Error ? cause.message : 'No fue posible crear el cliente' } }
async function statusChange(value: string) { if (!selected.value) return; selected.value = await platformApi.changeStatus(selected.value.id, value); await load() }
async function toggleAddon(code: string, active: boolean) { if (selected.value) selected.value = await platformApi.setAddon(selected.value.id, code, active) }
async function changePlan() { if (selected.value) selected.value = await platformApi.changeSubscription(selected.value.id, selectedPlanVersionId.value) }
async function resend() { if (selected.value) await platformApi.resendInvitation(selected.value.id) }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1048576).toFixed(1)} MB` }

onMounted(async () => { [plans.value, addons.value] = await Promise.all([platformApi.plans(), platformApi.addons()]); await load() })
</script>

<style scoped>
.field{width:100%;border:1px solid rgb(255 255 255/.1);border-radius:.75rem;background:#0f172a;padding:.75rem 1rem;outline:none}.field:focus{border-color:#fbbf24}.metric{display:flex;flex-direction:column;gap:.25rem;border-radius:1rem;background:rgb(255 255 255/.05);padding:1rem}.metric small{color:#94a3b8}.action{border-radius:.75rem;background:rgb(255 255 255/.1);padding:.65rem 1rem}.action:disabled{cursor:not-allowed;opacity:.4}.primary{border-radius:.75rem;background:#fbbf24;padding:.75rem 1.25rem;font-weight:600;color:#020617}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.25em;color:#fcd34d}.section-title{margin-top:2rem;font-weight:600}
</style>
