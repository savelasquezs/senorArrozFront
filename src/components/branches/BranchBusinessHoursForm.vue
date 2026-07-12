<template>
  <BaseCard>
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <CalendarDaysIcon class="h-6 w-6 text-emerald-600" />
            <h3 class="text-lg font-semibold text-gray-900">Horarios de atención</h3>
          </div>
          <p class="mt-1 text-sm text-gray-500">Se muestran a los clientes y forman parte del contexto del asistente de WhatsApp.</p>
        </div>
        <span class="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Zona horaria: Bogotá</span>
      </div>

      <section class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 class="font-semibold text-gray-900">Aplicar el mismo horario</h4>
            <p class="mt-1 text-xs text-gray-600">Configura rápidamente todos los días. Después puedes ajustar días individuales.</p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label class="text-xs font-medium text-gray-700">Apertura
              <input v-model="bulkOpenTime" type="time" class="mt-1 block rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500" />
            </label>
            <label class="text-xs font-medium text-gray-700">Cierre
              <input v-model="bulkCloseTime" type="time" class="mt-1 block rounded-lg border-gray-300 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500" />
            </label>
            <BaseButton variant="outline" :icon="ArrowPathIcon" @click="applyToAll">Aplicar a todos</BaseButton>
          </div>
        </div>
      </section>

      <div v-if="loading" class="py-10 text-center text-sm text-gray-500">Cargando horarios...</div>
      <div v-else class="overflow-hidden rounded-xl border border-gray-200">
        <div class="hidden grid-cols-[minmax(150px,1fr)_130px_180px_180px] gap-4 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid">
          <span>Día</span><span>Estado</span><span>Apertura</span><span>Cierre</span>
        </div>
        <div v-for="hour in orderedHours" :key="String(hour.dayOfWeek)" class="grid gap-4 border-t border-gray-100 px-4 py-4 first:border-t-0 md:grid-cols-[minmax(150px,1fr)_130px_180px_180px] md:items-center">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full" :class="hour.isClosed ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'">
              <ClockIcon class="h-5 w-5" />
            </div>
            <div><p class="font-semibold text-gray-900">{{ dayLabel(hour.dayOfWeek) }}</p><p class="text-xs" :class="hour.isClosed ? 'text-gray-400' : 'text-emerald-600'">{{ hour.isClosed ? 'Sin atención' : 'Atención disponible' }}</p></div>
          </div>
          <button type="button" class="relative inline-flex w-28 items-center rounded-full px-2 py-1 text-xs font-medium transition-colors" :class="hour.isClosed ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-700'" @click="toggleClosed(hour)">
            <span class="mr-2 h-3 w-3 rounded-full" :class="hour.isClosed ? 'bg-gray-500' : 'bg-emerald-500'" />{{ hour.isClosed ? 'Cerrado' : 'Abierto' }}
          </button>
          <label class="text-xs font-medium text-gray-500"><span class="md:hidden">Apertura</span><input v-model="hour.openTime" type="time" :disabled="hour.isClosed" class="mt-1 block w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 md:mt-0" /></label>
          <label class="text-xs font-medium text-gray-500"><span class="md:hidden">Cierre</span><input v-model="hour.closeTime" type="time" :disabled="hour.isClosed" class="mt-1 block w-full rounded-lg border-gray-300 bg-white text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 md:mt-0" /></label>
        </div>
      </div>

      <p v-if="message" class="rounded-lg px-3 py-2 text-sm" :class="messageType==='error'?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'">{{ message }}</p>
      <div class="flex justify-end"><BaseButton :icon="CheckIcon" :loading="saving" @click="save">Guardar horarios</BaseButton></div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowPathIcon, CalendarDaysIcon, CheckIcon, ClockIcon } from '@heroicons/vue/24/outline'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { branchBusinessHoursApi, type BranchBusinessHour } from '@/services/MainAPI/branchBusinessHoursApi'

const props=defineProps<{branchId:number}>()
const hours=ref<BranchBusinessHour[]>([]),loading=ref(false),saving=ref(false)
const bulkOpenTime=ref('08:00'),bulkCloseTime=ref('18:00'),message=ref(''),messageType=ref<'success'|'error'>('success')
const dayNames:Record<string,string>={sunday:'Domingo',monday:'Lunes',tuesday:'Martes',wednesday:'Miércoles',thursday:'Jueves',friday:'Viernes',saturday:'Sábado','0':'Domingo','1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado'}
const dayOrder:Record<string,number>={monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6,'1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'0':6}
const orderedHours=computed(()=>[...hours.value].sort((a,b)=>orderOf(a.dayOfWeek)-orderOf(b.dayOfWeek)))
function keyOf(day:BranchBusinessHour['dayOfWeek']){return String(day).toLowerCase()}
function dayLabel(day:BranchBusinessHour['dayOfWeek']){return dayNames[keyOf(day)]??`Día ${String(day)}`}
function orderOf(day:BranchBusinessHour['dayOfWeek']){return dayOrder[keyOf(day)]??99}
function defaults(){hours.value=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((day,i)=>({branchId:props.branchId,dayOfWeek:day,openTime:null,closeTime:null,isClosed:true,displayOrder:i}))}
function toggleClosed(hour:BranchBusinessHour){hour.isClosed=!hour.isClosed;if(hour.isClosed){hour.openTime=null;hour.closeTime=null}else{hour.openTime=bulkOpenTime.value;hour.closeTime=bulkCloseTime.value}}
function applyToAll(){if(!bulkOpenTime.value||!bulkCloseTime.value||bulkCloseTime.value<=bulkOpenTime.value){messageType.value='error';message.value='La hora de cierre debe ser posterior a la apertura.';return}hours.value.forEach(h=>{h.isClosed=false;h.openTime=bulkOpenTime.value;h.closeTime=bulkCloseTime.value});messageType.value='success';message.value='Horario aplicado a todos los días. Guarda los cambios para confirmarlos.'}
async function load(){loading.value=true;try{defaults();const response=await branchBusinessHoursApi.getHours(props.branchId);if(response.data?.length)hours.value=response.data}catch(error:any){messageType.value='error';message.value=error.message||'No se pudieron cargar los horarios.'}finally{loading.value=false}}
async function save(){saving.value=true;message.value='';try{const payload=orderedHours.value.map((h,i)=>({...h,openTime:h.isClosed?null:h.openTime,closeTime:h.isClosed?null:h.closeTime,displayOrder:i}));hours.value=(await branchBusinessHoursApi.save(props.branchId,payload)).data;messageType.value='success';message.value='Horarios guardados correctamente.'}catch(error:any){messageType.value='error';message.value=error.message||'No se pudieron guardar los horarios.'}finally{saving.value=false}}
onMounted(load)
</script>
