import { apiClient } from './client';
import type { Playlist } from './types';

export const playlistsApi = {
    getAssignedPlaylist: async (
        deviceId: string,
        signal?: AbortSignal,
    ): Promise<Playlist | null> => {
        const { data } = await apiClient.get<Playlist | null>(
            `/playlists/assigned/${encodeURIComponent(deviceId)}/device`,
            { signal },
        );
        return data;
    },
};
