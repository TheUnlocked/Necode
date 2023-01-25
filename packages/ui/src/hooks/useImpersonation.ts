import { IMPERSONATION_COOKIE } from '~api/constants';
import createGlobalState from '../util/globalState';
import Cookies from 'js-cookie';

const impersonationState = createGlobalState<string | undefined>(Cookies.get(IMPERSONATION_COOKIE));

export const [useImpersonation, getImpersonation] = impersonationState;

export function setImpersonation(impersonate?: string) {
    if (impersonate) {
        const prev = getImpersonation();
        Cookies.set(IMPERSONATION_COOKIE, impersonate);
        (async () => {
            try {
                const res = await fetch('/~api/me');
                if (res.ok) {
                    impersonationState[2](impersonate);
                    return;
                }
            }
            catch (e) {}
            if (prev === undefined) {
                Cookies.remove(IMPERSONATION_COOKIE);
            }
            else {
                Cookies.set(IMPERSONATION_COOKIE, prev);
            }
        })();
    }
    else {
        Cookies.remove(IMPERSONATION_COOKIE);
        impersonationState[2](undefined);
    }
}
