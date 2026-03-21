/** Identificador de sección del dashboard (sidebar + carga por vista). */
export const DASHBOARD_SECTION_IDS = [
	'principal',
	'ventas',
	'gastos',
	'domicilios',
	'mapa_entregas',
	'regalos',
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DASHBOARD_SECTION_NAV: ReadonlyArray<{ id: DashboardSectionId; label: string }> = [
	{ id: 'principal', label: 'Principal' },
	{ id: 'ventas', label: 'Ventas' },
	{ id: 'gastos', label: 'Gastos' },
	{ id: 'domicilios', label: 'Domicilios' },
	{ id: 'mapa_entregas', label: 'Mapa de entregas' },
	{ id: 'regalos', label: 'Regalos' },
];

export function isDashboardSectionId(v: string): v is DashboardSectionId {
	return (DASHBOARD_SECTION_IDS as readonly string[]).includes(v);
}
