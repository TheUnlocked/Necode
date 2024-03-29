export const MAX_NUM_NETWORKS = 2;
export enum NetworkId {
    OFFLINE = -1,
    NET_0,
    NET_1,
}

export type PolicyParamValue
    = { type: 'int', value: number }
    | { type: 'float', value: number }
    | { type: 'boolean', value: boolean }
    | { type: 'string', value: string }
    | { type: 'Policy', name: string, params: PolicyParams }
    | { type: 'option', value: PolicyParamValue | undefined }
    ;

export type PolicyParams = { [key: string]: PolicyParamValue };

export interface PolicyConfiguration {
    name: string;
    params?: PolicyParams;
}
