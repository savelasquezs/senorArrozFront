<template>
  <section>
    <header class="mb-8"><p class="eyebrow">Gobierno</p><h2 class="mt-2 text-3xl font-semibold">Configuracion</h2><p class="mt-2 text-slate-400">Los secretos no se almacenan aqui; permanecen en variables de entorno.</p></header>
    <form class="max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6" @submit.prevent="saveSettings"><label v-for="(_, key) in settings" :key="key" class="grid gap-2 sm:grid-cols-[240px_1fr]"><span class="text-sm text-slate-400">{{ key }}</span><input v-model="settings[key]" class="field" /></label><button class="primary">Guardar configuracion</button></form>

    <div class="mt-8 grid gap-4 lg:grid-cols-2">
      <article class="rounded-2xl border border-white/10 bg-white/5 p-6"><div class="flex items-center justify-between"><h3 class="font-semibold">Modulos</h3><button class="action" @click="newCatalog('module')">Nuevo</button></div><button v-for="item in modules" :key="item.code" class="mt-3 block w-full rounded-xl bg-slate-950/40 p-3 text-left text-sm" @click="editCatalog('module', item)"><span class="text-amber-300">{{ item.code }}</span> · {{ item.name }}<span class="float-right" :class="item.active ? 'text-emerald-300' : 'text-slate-500'">{{ item.active ? 'Activo' : 'Inactivo' }}</span></button></article>
      <article class="rounded-2xl border border-white/10 bg-white/5 p-6"><div class="flex items-center justify-between"><h3 class="font-semibold">Add-ons</h3><button class="action" @click="newCatalog('addon')">Nuevo</button></div><button v-for="item in addons" :key="item.code" class="mt-3 block w-full rounded-xl bg-slate-950/40 p-3 text-left text-sm" @click="editCatalog('addon', item)"><span class="text-amber-300">{{ item.code }}</span> · {{ item.name }}<span class="float-right" :class="item.active ? 'text-emerald-300' : 'text-slate-500'">{{ item.active ? 'Activo' : 'Inactivo' }}</span></button></article>
    </div>

    <div v-if="catalogEditor" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-5" @click.self="catalogEditor = false"><form class="grid w-full max-w-xl gap-4 rounded-3xl bg-slate-900 p-7" @submit.prevent="saveCatalog"><h3 class="text-xl font-semibold">{{ catalogForm.id ? 'Editar' : 'Crear' }} {{ catalogForm.kind === 'module' ? 'modulo' : 'add-on' }}</h3><input v-model="catalogForm.code" required pattern="[a-z0-9_]+" :disabled="!!catalogForm.id" class="field" placeholder="codigo_estable" /><input v-model="catalogForm.name" required class="field" placeholder="Nombre" /><textarea v-model="catalogForm.description" required class="field" placeholder="Descripcion" /><input v-if="catalogForm.kind === 'module'" v-model="catalogForm.category" required class="field" placeholder="Categoria" /><input v-model.number="catalogForm.displayOrder" type="number" min="0" class="field" placeholder="Orden" /><label class="flex gap-3"><input v-model="catalogForm.active" type="checkbox" />Activo</label><div class="flex justify-end gap-3"><button type="button" class="action" @click="catalogEditor = false">Cancelar</button><button class="primary">Guardar</button></div></form></div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { platformApi } from '@/services/platformApi'
import type { CatalogItem } from '@/types/saas'

const settings = reactive<Record<string, string>>({})
const modules = ref<CatalogItem[]>([])
const addons = ref<CatalogItem[]>([])
const catalogEditor = ref(false)
const catalogForm = reactive({ id: 0, kind: 'module' as 'module' | 'addon', code: '', name: '', description: '', category: 'operations', active: true, displayOrder: 0 })

async function loadCatalogs() { [modules.value, addons.value] = await Promise.all([platformApi.modules(), platformApi.addons()]) }
async function saveSettings() { Object.assign(settings, await platformApi.updateSettings(settings)) }
function newCatalog(kind: 'module' | 'addon') { Object.assign(catalogForm, { id: 0, kind, code: '', name: '', description: '', category: kind === 'module' ? 'operations' : 'addon', active: true, displayOrder: kind === 'module' ? modules.value.length + 1 : addons.value.length + 1 }); catalogEditor.value = true }
function editCatalog(kind: 'module' | 'addon', item: CatalogItem) { Object.assign(catalogForm, { ...item, kind }); catalogEditor.value = true }
async function saveCatalog() { const payload = { code: catalogForm.code, name: catalogForm.name, description: catalogForm.description, category: catalogForm.category, active: catalogForm.active, displayOrder: catalogForm.displayOrder }; if (catalogForm.kind === 'module') { if (catalogForm.id) await platformApi.updateModule(catalogForm.id, payload); else await platformApi.createModule(payload) } else if (catalogForm.id) await platformApi.updateAddon(catalogForm.id, payload); else await platformApi.createAddon(payload); catalogEditor.value = false; await loadCatalogs() }

onMounted(async () => { Object.assign(settings, await platformApi.settings()); await loadCatalogs() })
</script>

<style scoped>
.field{width:100%;border:1px solid rgb(255 255 255/.1);border-radius:.75rem;background:#0f172a;padding:.75rem 1rem;outline:none}.field:disabled{opacity:.5}.primary{border-radius:.75rem;background:#fbbf24;padding:.75rem 1.25rem;font-weight:600;color:#020617}.action{border-radius:.75rem;background:rgb(255 255 255/.1);padding:.6rem 1rem}.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.25em;color:#fcd34d}
</style>
