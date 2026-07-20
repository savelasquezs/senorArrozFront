<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-gray-600">Conecta aplicaciones de domicilios con esta sucursal.</p>
      <BaseButton :icon="PlusIcon" @click="openCreate">Crear proveedor</BaseButton>
    </div>
    <BaseLoading v-if="loading" text="Cargando aplicaciones..." />
    <BaseAlert v-else-if="errorText" variant="danger">{{ errorText }}</BaseAlert>
    <div v-else class="grid gap-4 md:grid-cols-2">
      <BaseCard v-for="provider in providers" :key="provider.key">
        <div class="flex items-start justify-between gap-3">
          <div><h3 class="text-lg font-semibold">{{ provider.name }}</h3><p class="text-sm text-gray-500">{{ provider.available ? statusText(provider.connection) : 'Próximamente' }}</p></div>
          <span :class="badgeClass(provider.connection)" class="rounded-full px-2 py-1 text-xs font-semibold">{{ provider.connection?.ready ? 'Operativa' : provider.connection ? 'Configurando' : 'Sin crear' }}</span>
        </div>
        <div v-if="provider.connection" class="mt-4 space-y-2 text-sm">
          <p>Tienda: <strong>{{ provider.connection.externalStoreId }}</strong></p>
          <p>Catálogo: {{ provider.connection.mappedCount }}/{{ provider.connection.mappingCount }} mapeados</p>
          <BaseAlert v-if="provider.connection.lastError" variant="danger">{{ provider.connection.lastError }}</BaseAlert>
          <div class="flex flex-wrap gap-2 pt-2">
            <BaseButton size="sm" variant="outline" @click="edit(provider.connection)">Configurar</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="testing" @click="testConnection">Probar conexión</BaseButton>
            <BaseButton size="sm" variant="outline" :loading="syncing" @click="syncCatalog">Sincronizar catálogo</BaseButton>
            <BaseButton size="sm" variant="outline" @click="showMappings = true">Mapear productos</BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseDialog v-model="showForm" :title="connection ? 'Configurar Rappi' : 'Crear Rappi'" size="2xl">
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="text-sm">Nombre<input v-model="form.displayName" class="mt-1 w-full rounded border p-2" required /></label>
          <label class="text-sm">Ambiente<select v-model="form.environment" class="mt-1 w-full rounded border p-2"><option value="simulator">Simulador</option><option value="sandbox">Sandbox</option><option value="production">Producción</option></select></label>
          <label class="text-sm">Client ID<input v-model="form.clientId" class="mt-1 w-full rounded border p-2" required /></label>
          <label class="text-sm">Client Secret<input v-model="form.clientSecret" type="password" class="mt-1 w-full rounded border p-2" :required="!connection?.clientSecretConfigured" :placeholder="connection?.clientSecretConfigured ? 'Déjalo vacío para conservarlo' : ''" /></label>
          <label class="text-sm">Store ID<input v-model="form.externalStoreId" class="mt-1 w-full rounded border p-2" required /></label>
          <label class="text-sm">App financiera<select v-model.number="form.financialAppId" class="mt-1 w-full rounded border p-2" required><option :value="0" disabled>Selecciona</option><option v-for="app in financialApps" :key="app.id" :value="app.id">{{ app.name }} — {{ app.bankName }}</option></select></label>
          <label class="text-sm">Preparación (min)<input v-model.number="form.defaultCookingTimeMinutes" type="number" min="5" max="180" class="mt-1 w-full rounded border p-2" /></label>
          <label class="flex items-center gap-2 pt-6 text-sm"><input v-model="form.isActive" type="checkbox" /> Activar conexión</label>
        </div>
        <BaseAlert v-if="formError" variant="danger">{{ formError }}</BaseAlert>
        <div class="flex justify-end gap-2"><BaseButton type="button" variant="outline" @click="showForm=false">Cancelar</BaseButton><BaseButton type="submit" :loading="saving">Guardar</BaseButton></div>
      </form>
    </BaseDialog>

    <BaseDialog v-model="showMappings" title="Mapeo de catálogo Rappi" size="4xl">
      <BaseAlert v-if="!mappings?.mappings.length" variant="info">Sincroniza el catálogo para comenzar el mapeo.</BaseAlert>
      <div v-else class="max-h-[60vh] overflow-auto"><table class="w-full text-sm"><thead><tr class="border-b text-left"><th class="p-2">Producto Rappi</th><th class="p-2">SKU</th><th class="p-2">Producto SeñorArroz</th></tr></thead><tbody><tr v-for="m in mappings.mappings" :key="m.id" class="border-b"><td class="p-2">{{ m.externalName }} <span class="text-xs text-gray-400">{{ m.itemType }}</span></td><td class="p-2">{{ m.externalSku }}</td><td class="p-2"><select :value="m.productId || 0" class="w-full rounded border p-2" @change="mapProduct(m.id, Number(($event.target as HTMLSelectElement).value))"><option :value="0" disabled>Sin mapear</option><option v-for="p in mappings.products" :key="p.id" :value="p.id">{{ p.name }}</option></select></td></tr></tbody></table></div>
    </BaseDialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import BaseButton from '@/components/ui/BaseButton.vue'; import BaseCard from '@/components/ui/BaseCard.vue'; import BaseDialog from '@/components/ui/BaseDialog.vue'; import BaseAlert from '@/components/ui/BaseAlert.vue'; import BaseLoading from '@/components/ui/BaseLoading.vue'
import { integrationApi } from '@/services/MainAPI/integrationApi'; import { appApi } from '@/services/MainAPI/appApi'
import type { App } from '@/types/bank'; import type { DeliveryProviderCard, RappiConnection, RappiMappings, UpsertRappiConnection } from '@/types/integrations'
const props = defineProps<{ branchId: number }>()
const providers=ref<DeliveryProviderCard[]>([]), connection=ref<RappiConnection|null>(null), financialApps=ref<App[]>([]), mappings=ref<RappiMappings|null>(null)
const loading=ref(false),saving=ref(false),testing=ref(false),syncing=ref(false),showForm=ref(false),showMappings=ref(false),errorText=ref(''),formError=ref('')
const form=reactive<UpsertRappiConnection>({displayName:'Rappi',environment:'simulator',clientId:'simulator',clientSecret:'simulator',externalStoreId:'demo-store',financialAppId:0,defaultCookingTimeMinutes:30,isActive:false})
function apply(c:RappiConnection|null){connection.value=c;if(c)Object.assign(form,{displayName:c.displayName,environment:c.environment,clientId:c.clientId,clientSecret:'',externalStoreId:c.externalStoreId,financialAppId:c.financialAppId,defaultCookingTimeMinutes:c.defaultCookingTimeMinutes,isActive:c.isActive})}
async function load(){loading.value=true;errorText.value='';try{const [r,a]=await Promise.all([integrationApi.getDeliveryApps(props.branchId),appApi.getApps({branchId:props.branchId,active:true,page:1,pageSize:100})]);providers.value=r.data.providers;apply((providers.value.find(x=>x.key==='rappi')?.connection as RappiConnection)||null);financialApps.value=a.items;if(connection.value){const m=await integrationApi.getRappiMappings(props.branchId);mappings.value=m.data}}catch(e:any){errorText.value=e.message}finally{loading.value=false}}
function openCreate(){if(connection.value){edit(connection.value);return}showForm.value=true} function edit(c:RappiConnection){apply(c);showForm.value=true}
async function save(){saving.value=true;formError.value='';try{const r=await integrationApi.saveRappi(props.branchId,{...form});apply(r.data);showForm.value=false;await load()}catch(e:any){formError.value=e.message}finally{saving.value=false}}
async function testConnection(){testing.value=true;try{const r=await integrationApi.testRappi(props.branchId);apply(r.data);await load()}catch(e:any){errorText.value=e.message}finally{testing.value=false}}
async function syncCatalog(){syncing.value=true;try{const r=await integrationApi.syncRappiCatalog(props.branchId);mappings.value=r.data;showMappings.value=true;await load()}catch(e:any){errorText.value=e.message}finally{syncing.value=false}}
async function mapProduct(id:number,productId:number){if(!productId)return;const r=await integrationApi.mapRappiProduct(props.branchId,id,productId);mappings.value=r.data;await load()}
function statusText(c?:RappiConnection|null){if(!c)return'Proveedor disponible';if(c.ready)return'Conectada y lista para operar';if(!c.isVerified)return'Pendiente probar conexión';if(!c.mappingComplete)return'Pendiente completar catálogo';return'Configuración incompleta'}
function badgeClass(c?:RappiConnection|null){return c?.ready?'bg-green-100 text-green-700':c?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600'}
watch(()=>props.branchId,load);onMounted(load)
</script>
