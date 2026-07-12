<template>
  <div class="space-y-4">
    <div class="flex justify-between"><p class="text-sm text-gray-500">La foto, descripción e ingredientes se comparten entre varios productos.</p><BaseButton size="sm" @click="startNew">Nueva ficha</BaseButton></div>
    <div class="grid gap-3 sm:grid-cols-2">
      <button v-for="item in profiles" :key="item.id" type="button" class="flex gap-3 rounded-lg border p-3 text-left hover:bg-gray-50" @click="edit(item)">
        <img v-if="item.photoUrl" :src="item.photoUrl" class="h-20 w-20 rounded-md object-cover" alt="Foto" />
        <div><p class="font-semibold text-gray-900">{{ item.name }}</p><p class="line-clamp-2 text-sm text-gray-500">{{ item.description || 'Sin descripción' }}</p></div>
      </button>
    </div>
    <div v-if="editing" class="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
      <BaseInput v-model="form.name" label="Nombre" required />
      <label class="block text-sm font-medium text-gray-700">Descripción<textarea v-model="form.description" rows="3" class="mt-1 w-full rounded-lg border border-gray-300 p-2" /></label>
      <label class="block text-sm font-medium text-gray-700">Ingredientes<textarea v-model="form.ingredients" rows="3" class="mt-1 w-full rounded-lg border border-gray-300 p-2" /></label>
      <div v-if="editing.id" class="flex flex-wrap items-center gap-3">
        <img v-if="editing.photoUrl" :src="editing.photoUrl" class="h-24 w-24 rounded-md object-cover" alt="Foto actual" />
        <input type="file" accept="image/*" @change="pickPhoto" />
        <BaseButton v-if="editing.photoUrl" variant="danger" size="sm" @click="removePhoto">Eliminar foto</BaseButton>
      </div>
      <p v-else class="text-xs text-gray-500">Guarda primero la ficha para cargar su fotografía.</p>
      <div class="flex justify-end gap-2"><BaseButton variant="secondary" @click="editing = null">Cancelar</BaseButton><BaseButton :loading="saving" @click="save">Guardar ficha</BaseButton></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { commercialProfileApi } from '@/services/MainAPI/commercialProfileApi'
import type { CommercialProfile } from '@/types/product'

const props = defineProps<{ branchId: number }>()
const profiles = ref<CommercialProfile[]>([]); const editing = ref<CommercialProfile | null>(null); const saving = ref(false)
const form = reactive({ name: '', description: '', ingredients: '' })
async function load() { profiles.value = (await commercialProfileApi.getAll(props.branchId)).data }
function startNew() { editing.value = { id: 0, branchId: props.branchId, name: '' }; Object.assign(form, { name: '', description: '', ingredients: '' }) }
function edit(item: CommercialProfile) { editing.value = item; Object.assign(form, { name: item.name, description: item.description || '', ingredients: item.ingredients || '' }) }
async function save() { if (!form.name.trim()) return; saving.value = true; try { const payload = { branchId: props.branchId, name: form.name, description: form.description || null, ingredients: form.ingredients || null }; editing.value = editing.value?.id ? (await commercialProfileApi.update(editing.value.id, payload)).data : (await commercialProfileApi.create(payload)).data; await load() } finally { saving.value = false } }
async function pickPhoto(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !editing.value?.id) return; editing.value = (await commercialProfileApi.uploadPhoto(editing.value.id, file)).data; await load() }
async function removePhoto() { if (!editing.value?.id) return; await commercialProfileApi.deletePhoto(editing.value.id); editing.value.photoUrl = null; await load() }
onMounted(load)
</script>
