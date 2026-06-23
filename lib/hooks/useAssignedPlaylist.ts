import { useQuery } from '@tanstack/react-query';
import { playlistsApi } from '../api/playlists.api';
import { playlistKeys } from '../api/query-keys';
import type { Playlist } from '../api/types';

export function useAssignedPlaylist(
    deviceId: string | undefined,
    options?: { enabled?: boolean },
) {
    return useQuery<Playlist | null>({
        queryKey: playlistKeys.assigned(deviceId ?? ''),
        queryFn: ({ signal }) =>
            playlistsApi.getAssignedPlaylist(deviceId!, signal),
        enabled: (options?.enabled ?? true) && !!deviceId,
        refetchInterval: 30_000,
    });
}
