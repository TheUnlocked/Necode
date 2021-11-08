export default function sortByProperty<T extends { [_ in U]: number | string }, U extends keyof T>(arr: T[], prop: U) {
    return arr.sort((a, b) => {
        const aProp = a[prop];
        const bProp = b[prop];
        if (typeof aProp === 'string' && typeof bProp === 'string') {
            return aProp.localeCompare(bProp);
        }
        if (typeof aProp === 'number' && typeof bProp === 'number') {
            return aProp - bProp;
        }
        return 0;
    })
}