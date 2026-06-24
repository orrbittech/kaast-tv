import { useQuery } from '@tanstack/react-query';
import { playlistsApi } from '../api/playlists.api';
import { playlistKeys } from '../api/query-keys';
import type { ScheduledForDeviceResponse } from '../api/types';

export function useScheduledPlaylist(
    deviceId: string | undefined,
    options?: { enabled?: boolean },
) {
    return useQuery<ScheduledForDeviceResponse>({
        queryKey: playlistKeys.scheduled(deviceId ?? ''),
        queryFn: ({ signal }) =>
            playlistsApi.getScheduledForDevice(deviceId!, signal),
        enabled: (options?.enabled ?? true) && !!deviceId,
        refetchInterval: 30_000,
    });
}

/** @deprecated Use useScheduledPlaylist */
export function useAssignedPlaylist(
    deviceId: string | undefined,
    options?: { enabled?: boolean },
) {
    return useScheduledPlaylist(deviceId, options);
}
