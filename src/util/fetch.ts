import { getImpersonation } from '../hooks/ImpersonationHook';

export default function fetch(input: RequestInfo, init?: RequestInit | undefined): Promise<Response> {

    const impersonate = getImpersonation();

    return window.fetch(input, {
        ...init,
        headers: {
            ...init?.headers,
            ...(impersonate ? { impersonate } : undefined),
        }
    });
}
