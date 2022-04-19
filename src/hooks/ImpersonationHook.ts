import createGlobalState from '../util/globalState';

const impersonationState = createGlobalState<string>();

export const [useImpersonation, getImpersonation] = impersonationState;
export function setImpersonation(impersonate?: string) {
    if (impersonate) {
        fetch<true>('/api/me', { headers: { impersonate } }).then(res => {
            if (res.ok) {
                impersonationState[2](impersonate);
            }
        }).catch(() => {});
    }
    else {
        impersonationState[2](undefined);
    }
}