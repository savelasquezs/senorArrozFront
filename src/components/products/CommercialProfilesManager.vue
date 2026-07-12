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
      <BaseButton v-if="editing.id" variant="outline" size="sm" @click="openProducts">Seleccionar productos</BaseButton>
      <p v-else class="text-xs text-gray-500">Guarda primero la ficha para cargar su fotografía.</p>
      <div class="flex justify-end gap-2"><BaseButton variant="secondary" @click="editing = null">Cancelar</BaseButton><BaseButton :loading="saving" @click="save">Guardar ficha</BaseButton></div>
    </div>
    <BaseDialog v-model="showProducts" title="Productos que usan esta ficha" size="sm">
      <BaseInput v-model="productSearch" placeholder="Buscar productos..." />
      <p class="my-3 text-xs text-gray-500">{{ selectedProductIds.size }} productos seleccionados</p>
      <div v-if="loadingProducts" class="py-8 text-center text-sm text-gray-500">Cargando productos...</div>
      <div v-else class="max-h-80 space-y-1 overflow-y-auto">
        <label v-for="product in filteredProducts" :key="product.id" class="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-gray-50">
          <input type="checkbox" class="mt-1 rounded border-gray-300 text-emerald-600" :checked="selectedProductIds.has(product.id)" @change="toggleProduct(product.id)" />
          <span class="min-w-0"><span class="block text-sm font-medium text-gray-900">{{ product.name }}</span><span v-if="product.commercialProfileId && product.commercialProfileId !== editing?.id" class="block text-xs text-amber-600">Actualmente usa: {{ product.commercialProfileName }}</span><span v-if="!product.active" class="block text-xs text-gray-400">Inactivo</span></span>
        </label>
        <p v-if="!filteredProducts.length" class="py-8 text-center text-sm text-gray-500">No se encontraron productos.</p>
      </div>
      <div class="mt-4 flex justify-end gap-2 border-t pt-4"><BaseButton variant="secondary" @click="showProducts=false">Cancelar</BaseButton><BaseButton :loading="savingProducts" @click="saveProducts">Guardar selección</BaseButton></div>
    </BaseDialog>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import { commercialProfileApi } from '@/services/MainAPI/commercialProfileApi'
import type { CommercialProfile } from '@/types/product'
import type { CommercialProfileProduct } from '@/services/MainAPI/commercialProfileApi'

const props = defineProps<{ branchId: number }>()
const profiles = ref<CommercialProfile[]>([]); const editing = ref<CommercialProfile | null>(null); const saving = ref(false)
const form = reactive({ name: '', description: '', ingredients: '' })
const showProducts=ref(false),loadingProducts=ref(false),savingProducts=ref(false),productSearch=ref('')
const products=ref<CommercialProfileProduct[]>([]),selectedProductIds=ref(new Set<number>())
const filteredProducts=computed(()=>{const q=productSearch.value.trim().toLocaleLowerCase();return q?products.value.filter(x=>x.name.toLocaleLowerCase().includes(q)):products.value})
async function load() { profiles.value = (await commercialProfileApi.getAll(props.branchId)).data }
function startNew() { editing.value = { id: 0, branchId: props.branchId, name: '' }; Object.assign(form, { name: '', description: '', ingredients: '' }) }
function edit(item: CommercialProfile) { editing.value = item; Object.assign(form, { name: item.name, description: item.description || '', ingredients: item.ingredients || '' }) }
async function save() { if (!form.name.trim()) return; saving.value = true; try { const payload = { branchId: props.branchId, name: form.name, description: form.description || null, ingredients: form.ingredients || null }; editing.value = editing.value?.id ? (await commercialProfileApi.update(editing.value.id, payload)).data : (await commercialProfileApi.create(payload)).data; await load() } finally { saving.value = false } }
async function pickPhoto(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || !editing.value?.id) return; editing.value = (await commercialProfileApi.uploadPhoto(editing.value.id, file)).data; await load() }
async function removePhoto() { if (!editing.value?.id) return; await commercialProfileApi.deletePhoto(editing.value.id); editing.value.photoUrl = null; await load() }
async function openProducts(){if(!editing.value?.id)return;showProducts.value=true;productSearch.value='';loadingProducts.value=true;try{products.value=(await commercialProfileApi.getProducts(editing.value.id)).data;selectedProductIds.value=new Set(products.value.filter(x=>x.commercialProfileId===editing.value?.id).map(x=>x.id))}finally{loadingProducts.value=false}}
function toggleProduct(id:number){const next=new Set(selectedProductIds.value);next.has(id)?next.delete(id):next.add(id);selectedProductIds.value=next}
async function saveProducts(){if(!editing.value?.id)return;savingProducts.value=true;try{await commercialProfileApi.setProducts(editing.value.id,[...selectedProductIds.value]);showProducts.value=false}finally{savingProducts.value=false}}
onMounted(load)
</script>
