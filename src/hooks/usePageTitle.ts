import { useMemo } from 'react';
import { useBreadcrumbsData } from './useBreadcrumbs';

export default function usePageTitle() {
    const breadcrumbs = useBreadcrumbsData();

    return useMemo(() =>
        breadcrumbs
            .map(x => x.title ?? (typeof x.label === 'string' ? x.label : undefined))
            .filter(x => typeof x === 'string')
            .join(' / '),
        [breadcrumbs]);
}
