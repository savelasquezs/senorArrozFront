export type RankingColumnFormat = 'text' | 'currency' | 'number' | 'minutes';

export interface RankingColumn {
	key: string;
	label: string;
	sortable?: boolean;
	format?: RankingColumnFormat;
	/** Barra proporcional al máximo de la columna */
	miniBar?: boolean;
}
