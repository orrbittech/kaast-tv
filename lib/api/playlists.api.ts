import { apiClient } from './client';
import type { ScheduledForDeviceResponse, ScheduledPlaybackState } from './types';

export const playlistsApi = {
    getScheduledForDevice: async (
        deviceId: string,
        signal?: AbortSignal,
    ): Promise<ScheduledForDeviceResponse> => {
        const { data } = await apiClient.get<ScheduledForDeviceResponse>(
            `/playlists/scheduled/${encodeURIComponent(deviceId)}/device`,
            { signal },
        );
        return data;
    },

    updateScheduledPlayback: async (
        deviceId: string,
        body: Partial<ScheduledPlaybackState> & {
            action?: 'pause' | 'resume' | 'sync';
        },
        signal?: AbortSignal,
    ): Promise<ScheduledPlaybackState | null> => {
        const { data } = await apiClient.patch<ScheduledPlaybackState | null>(
            `/playlists/scheduled/${encodeURIComponent(deviceId)}/playback`,
            body,
            { signal },
        );
        return data;
    },

    /** @deprecated Use getScheduledForDevice */
    getAssignedPlaylist: async (
        deviceId: string,
        signal?: AbortSignal,
    ) => {
        const response = await playlistsApi.getScheduledForDevice(deviceId, signal);
        return response.playlist;
    },
};
