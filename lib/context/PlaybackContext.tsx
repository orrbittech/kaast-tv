import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { mediaSocket } from '../ws/media-socket';
import { playlistPlayer, type PlaybackState } from '../playback/playlist-player';
import { mediaCache } from '../cache/media-cache';
import { playlistsApi } from '../api/playlists.api';
import { playlistKeys } from '../api/query-keys';
import { usePairing } from './PairingContext';
import type {
    ControlCommand,
    ScheduledForDeviceResponse,
    PlaylistItem,
} from '../api/types';
import { snapshotStore } from '../snapshot/snapshot-store';

interface PlaybackContextValue {
    playbackState: PlaybackState;
    wsConnected: boolean;
    loadAndPlay: (
        items: PlaylistItem[],
        options?: {
            playlistId?: string | null;
            scheduleId?: string | null;
            loop?: boolean;
            startIndex?: number;
            startPosition?: number;
            playing?: boolean;
        },
    ) => Promise<void>;
    handleControlCommand: (command: ControlCommand) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

const SESSION_REPORT_INTERVAL_MS = 5000;

function getPlaybackKey(response: ScheduledForDeviceResponse | undefined): string {
    if (!response?.playlist) return 'none';
    const scheduleId = response.schedule?.id ?? 'manual';
    return `${response.playlist.id}:${scheduleId}`;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
    const { pairing } = usePairing();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [playbackState, setPlaybackState] = useState<PlaybackState>(
        playlistPlayer.getState(),
    );
    const [wsConnected, setWsConnected] = useState(false);
    const lastReportRef = useRef(0);
    const lastLoadedKeyRef = useRef<string | null>(null);
    const lastSentSnapshotRef = useRef<string | null>(null);

    const { data: scheduledPayload } = useQuery<ScheduledForDeviceResponse>({
        queryKey: playlistKeys.scheduled(pairing?.deviceId ?? ''),
        queryFn: ({ signal }) =>
            playlistsApi.getScheduledForDevice(pairing!.deviceId, signal),
        enabled: !!pairing?.deviceId,
        refetchInterval: 30_000,
    });

    useEffect(() => {
        return playlistPlayer.subscribe(setPlaybackState);
    }, []);

    const persistPlaybackState = useCallback(
        async (action?: 'pause' | 'resume' | 'sync') => {
            if (!pairing?.deviceId) return;
            const snapshot = playlistPlayer.getSessionSnapshot();
            try {
                await playlistsApi.updateScheduledPlayback(pairing.deviceId, {
                    action,
                    playlistId: snapshot.playlistId,
                    scheduleId: snapshot.scheduleId,
                    currentItemIndex: snapshot.currentItemIndex,
                    position: snapshot.position,
                    duration: snapshot.duration,
                    playing: snapshot.playing,
                    mediaUrl: snapshot.mediaUrl,
                    volume: snapshot.volume,
                });
            } catch {
                // Non-blocking sync for TV playback continuity
            }
        },
        [pairing?.deviceId],
    );

    const reportSession = useCallback(
        (force = false) => {
            const now = Date.now();
            if (!force && now - lastReportRef.current < SESSION_REPORT_INTERVAL_MS) {
                return;
            }
            lastReportRef.current = now;
            const snapshot = playlistPlayer.getSessionSnapshot();
            const currentSnapshot = snapshotStore.get();
            const snapshotChanged =
                currentSnapshot !== lastSentSnapshotRef.current;
            if (snapshotChanged) {
                lastSentSnapshotRef.current = currentSnapshot;
            }
            mediaSocket.emitSessionState({
                ...snapshot,
                ...(snapshotChanged ? { snapshotData: currentSnapshot } : {}),
            });
            void persistPlaybackState('sync');
        },
        [persistPlaybackState],
    );

    const loadAndPlay = useCallback(
        async (
            items: PlaylistItem[],
            options?: {
                playlistId?: string | null;
                scheduleId?: string | null;
                loop?: boolean;
                startIndex?: number;
                startPosition?: number;
                playing?: boolean;
            },
        ) => {
            try {
                await playlistPlayer.loadPlaylist(
                    items,
                    (url) => mediaCache.resolvePlaybackUri(url),
                    {
                        playlistId: options?.playlistId,
                        scheduleId: options?.scheduleId,
                        loop: options?.loop,
                        startIndex: options?.startIndex,
                        startPosition: options?.startPosition,
                        playing: options?.playing,
                    },
                );
                reportSession(true);
            } catch (err) {
                console.warn(
                    '[Playback] Failed to load playlist:',
                    err instanceof Error ? err.message : err,
                );
            }
        },
        [reportSession],
    );

    const refreshScheduledPlaylist = useCallback(async () => {
        if (!pairing?.deviceId) return;
        await queryClient.invalidateQueries({
            queryKey: playlistKeys.scheduled(pairing.deviceId),
        });
        try {
            const payload = await playlistsApi.getScheduledForDevice(pairing.deviceId);
            queryClient.setQueryData(
                playlistKeys.scheduled(pairing.deviceId),
                payload,
            );
        } catch {
            // Query invalidation will retry on next poll
        }
    }, [pairing?.deviceId, queryClient]);

    const startScheduledPlayback = useCallback(
        async (payload: ScheduledForDeviceResponse) => {
            if (!payload.playlist?.items?.length) return;

            const playbackKey = getPlaybackKey(payload);
            const sameSlot = playbackKey === lastLoadedKeyRef.current;
            if (sameSlot) return;

            lastLoadedKeyRef.current = playbackKey;
            const state = payload.playbackState;

            await loadAndPlay(payload.playlist.items, {
                playlistId: payload.playlist.id,
                scheduleId: payload.schedule?.id ?? null,
                loop: payload.schedule?.loopPlaylist ?? true,
                startIndex: state?.currentItemIndex ?? 0,
                startPosition: state?.position ?? 0,
                playing: state?.playing ?? true,
            });
            router.push('/(main)/player');
        },
        [loadAndPlay, router],
    );

    useEffect(() => {
        if (!scheduledPayload?.playlist?.items?.length) {
            if (scheduledPayload?.source === null) {
                lastLoadedKeyRef.current = null;
            }
            return;
        }
        void startScheduledPlayback(scheduledPayload);
    }, [scheduledPayload, wsConnected, startScheduledPlayback]);

    const handleControlCommand = useCallback(
        (command: ControlCommand) => {
            switch (command.command) {
                case 'play':
                    playlistPlayer.play();
                    void persistPlaybackState('resume');
                    break;
                case 'pause':
                    playlistPlayer.pause();
                    void persistPlaybackState('pause');
                    break;
                case 'seek': {
                    const position = Number(command.payload?.position ?? 0);
                    playlistPlayer.seek(position);
                    break;
                }
                case 'volume': {
                    const volume = Number(command.payload?.volume ?? 1);
                    playlistPlayer.setVolume(volume);
                    break;
                }
                case 'playPlaylist':
                    if (pairing?.deviceId) {
                        lastLoadedKeyRef.current = null;
                        void refreshScheduledPlaylist().then(() =>
                            playlistsApi
                                .getScheduledForDevice(pairing.deviceId)
                                .then((payload) => {
                                    if (payload.playlist?.items?.length) {
                                        void startScheduledPlayback(payload);
                                    }
                                })
                                .catch(() => undefined),
                        );
                    }
                    break;
                default:
                    break;
            }
            reportSession(true);
        },
        [
            pairing?.deviceId,
            queryClient,
            reportSession,
            persistPlaybackState,
            startScheduledPlayback,
            refreshScheduledPlaylist,
        ],
    );

    useEffect(() => {
        if (!pairing) {
            mediaSocket.disconnect();
            setWsConnected(false);
            return;
        }

        mediaSocket.connect(pairing);
        const unsubConn = mediaSocket.onConnectionChange((connected) => {
            setWsConnected(connected);
            if (connected && pairing.deviceId) {
                queryClient.invalidateQueries({
                    queryKey: playlistKeys.scheduled(pairing.deviceId),
                });
            }
        });
        const unsubControl = mediaSocket.onControl(handleControlCommand);
        const unsubPlaylist = mediaSocket.onPlaylistUpdated(() => {
            void refreshScheduledPlaylist();
        });

        return () => {
            unsubConn();
            unsubControl();
            unsubPlaylist();
            mediaSocket.disconnect();
        };
    }, [pairing, handleControlCommand, queryClient, refreshScheduledPlaylist]);

    useEffect(() => {
        reportSession(true);
        const interval = setInterval(() => reportSession(), SESSION_REPORT_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [
        playbackState.playing,
        playbackState.position,
        playbackState.currentIndex,
        playbackState.volume,
        reportSession,
    ]);

    const value = useMemo(
        () => ({
            playbackState,
            wsConnected,
            loadAndPlay,
            handleControlCommand,
        }),
        [playbackState, wsConnected, loadAndPlay, handleControlCommand],
    );

    return (
        <PlaybackContext.Provider value={value}>
            {children}
        </PlaybackContext.Provider>
    );
}

export function usePlayback(): PlaybackContextValue {
    const ctx = useContext(PlaybackContext);
    if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
    return ctx;
}
