// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_APP_NAME: string
    readonly VITE_LOGO_URL: string
    readonly VITE_WHATSAPP_API_URL: string
    readonly VITE_GOOGLE_MAPS_API_KEY: string
    readonly VITE_GOOGLE_MAPS_MAP_ID?: string
    /** Si es `true`, la sección Principal del dashboard usa mocks en lugar de `GET /api/dashboard/main`. */
    readonly VITE_DASHBOARD_PRINCIPAL_MOCK?: string
    /** Si es `true`, Domicilios no llama a `GET /api/dashboard/delivery` y el shell usa datos demo. */
    readonly VITE_DASHBOARD_DELIVERY_MOCK?: string
}


interface ImportMeta {
    readonly env: ImportMetaEnv
}