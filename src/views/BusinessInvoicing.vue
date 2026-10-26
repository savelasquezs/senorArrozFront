<template>
    <div class="contents">
        <div class="mx-auto max-w-5xl space-y-6 py-2">
            <header><p class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Configuración empresarial</p><h1 class="mt-2 text-2xl font-semibold text-slate-900">Facturación electrónica</h1><p class="mt-2 text-sm text-slate-500">Administra el proveedor y el emisor de todo el negocio.</p></header>
            <TenantElectronicInvoicing />
        </div>
    </div>
</template>

<script setup lang="ts">
import TenantElectronicInvoicing from '@/components/branches/TenantElectronicInvoicing.vue'
</script>
