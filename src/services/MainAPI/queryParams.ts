type QueryParamValue = string | number | boolean | null | undefined

export type QueryParamMapper<TFilters extends object> = Record<
    string,
    keyof TFilters | ((filters: TFilters) => QueryParamValue)
>

function isSerializableQueryParam(
    value: QueryParamValue
): value is string | number | boolean {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    )
}

export function buildQueryParams<TFilters extends object>(
    filters: TFilters | undefined,
    mapper: QueryParamMapper<TFilters>
): Record<string, string | number | boolean> {
    if (!filters) {
        return {}
    }

    const params: Record<string, string | number | boolean> = {}

    for (const [targetKey, source] of Object.entries(mapper)) {
        const value =
            typeof source === 'function'
                ? source(filters)
                : (filters[source] as QueryParamValue)

        if (value !== undefined && value !== null && value !== '' && isSerializableQueryParam(value)) {
            params[targetKey] = value
        }
    }

    return params
}
