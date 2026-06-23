import { useQuery } from '@tanstack/react-query';
import { devicesApi } from '../api/devices.api';
import { pairingKeys } from '../api/query-keys';
import type { PairingStatus } from '../api/types';

export function usePairingStatus(
    code: string | null,
    options?: { enabled?: boolean },
) {
    return useQuery<PairingStatus>({
        queryKey: pairingKeys.status(code ?? ''),
        queryFn: () => devicesApi.getPairingStatus(code!),
        enabled: (options?.enabled ?? true) && !!code,
        refetchInterval: (query) =>
            query.state.data?.status === 'pending' ? 3000 : false,
    });
}
