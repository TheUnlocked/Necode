export type PaginationParams = { 'page:index'?: number, 'page:from'?: string, 'page:count'?: number };
export const paginationParams = (['page:index?', 'page:from?', 'page:count?'] as const) satisfies readonly `${keyof PaginationParams}?`[];
