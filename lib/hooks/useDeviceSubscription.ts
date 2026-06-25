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
        refetchInterval: 5 * 60 * 1000,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}
