import { useQuery } from '@tanstack/react-query';
import { devicesApi } from '../api/devices.api';

export function useDeviceSubscription(
    deviceId: string | undefined,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ['devices', 'subscription', deviceId ?? ''],
        queryFn: () => devicesApi.getSubscriptionStatus(deviceId!),
        enabled: (options?.enabled ?? true) && !!deviceId,
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}
