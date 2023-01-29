export const MAX_NUM_NETWORKS = 2;
export enum NetworkId {
    OFFLINE = -1,
    NET_0,
    NET_1,
}

export interface PolicyConfiguration {
    name: string;
    params?: { [key: string]: any };
}
