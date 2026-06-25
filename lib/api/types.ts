/** Playlist from playlists API */
export interface Playlist {
    id: string;
    name: string;
    locationId?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: PlaylistItem[];
}

/** Playlist item from playlists API */
export interface PlaylistItem {
    id: string;
    playlistId?: string;
    mediaId: string;
    mediaUrl: string;
    title?: string | null;
    duration?: number | null;
    order: number;
    createdAt?: string;
}

/** Response from POST /devices/pairing-code */
export interface GeneratePairingCodeResponse {
    code: string;
}

/** Pairing status from GET /pairing/:code/status */
export interface PairingStatus {
    status: 'pending' | 'verified' | 'expired' | 'subscription_required';
    deviceId?: string;
    clerkOrgId?: string;
    locationId?: string | null;
    upgradeUrl?: string;
}

/** Device subscription status from GET /devices/:deviceId/subscription */
export interface DeviceSubscriptionStatus {
    isActive: boolean;
    upgradeUrl: string;
}

/** Persisted pairing context after successful pairing */
export interface PairingContext {
    deviceId: string;
    clerkOrgId: string;
    locationId: string | null;
    pairedAt: string;
}

/** Media session state reported to server */
export interface MediaSessionState {
    deviceId: string;
    mediaUrl?: string | null;
    position: number;
    duration: number;
    playing: boolean;
    volume?: number;
    snapshotData?: string | null;
    playlistId?: string | null;
    scheduleId?: string | null;
    currentItemIndex?: number;
}

export interface ScheduledPlaybackState {
    playlistId: string | null;
    scheduleId: string | null;
    currentItemIndex: number;
    position: number;
    duration: number;
    playing: boolean;
    volume: number | null;
    mediaUrl: string | null;
    pausedAt: string | null;
    slotStartedAt: string | null;
    accumulatedPauseMs: number;
}

export interface PlaylistScheduleInfo {
    id: string;
    startTime: string;
    endTime: string;
    loopPlaylist: boolean;
    priority: 'low' | 'medium' | 'high';
    repeatType: string;
    timezone: string;
}

export interface ScheduledForDeviceResponse {
    source: 'schedule' | 'manual' | null;
    schedule: PlaylistScheduleInfo | null;
    playlist: Playlist | null;
    playbackState: ScheduledPlaybackState | null;
}

/** Remote control command from WebSocket */
export interface ControlCommand {
    deviceId: string;
    command: 'play' | 'pause' | 'seek' | 'volume' | 'playPlaylist';
    payload?: Record<string, unknown>;
}

export type CacheStatus = 'pending' | 'downloading' | 'cached' | 'error';

export interface CachedMediaEntry {
    mediaUrl: string;
    playlistItemId?: string;
    localUri: string | null;
    bytes: number;
    status: CacheStatus;
    updatedAt: string;
    error?: string;
}
