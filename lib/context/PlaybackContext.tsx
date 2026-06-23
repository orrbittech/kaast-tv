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
import { useQueryClient } from '@tanstack/react-query';
import { mediaSocket } from '../ws/media-socket';
import { playlistPlayer, type PlaybackState } from '../playback/playlist-player';
import { mediaCache } from '../cache/media-cache';
import { playlistsApi } from '../api/playlists.api';
import { playlistKeys } from '../api/query-keys';
import { usePairing } from './PairingContext';
import type { ControlCommand } from '../api/types';
import { snapshotStore } from '../snapshot/snapshot-store';

interface PlaybackContextValue {
    playbackState: PlaybackState;
    wsConnected: boolean;
    loadAndPlay: (items: import('../api/types').PlaylistItem[]) => Promise<void>;
    handleControlCommand: (command: ControlCommand) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

const SESSION_REPORT_INTERVAL_MS = 5000;

export function PlaybackProvider({ children }: { children: ReactNode }) {
    const { pairing } = usePairing();
    const queryClient = useQueryClient();
    const [playbackState, setPlaybackState] = useState<PlaybackState>(
        playlistPlayer.getState(),
    );
    const [wsConnected, setWsConnected] = useState(false);
    const lastReportRef = useRef(0);

    useEffect(() => {
        return playlistPlayer.subscribe(setPlaybackState);
    }, []);

    const reportSession = useCallback(
        (force = false) => {
            const now = Date.now();
            if (!force && now - lastReportRef.current < SESSION_REPORT_INTERVAL_MS) {
                return;
            }
            lastReportRef.current = now;
            const snapshot = playlistPlayer.getSessionSnapshot();
            mediaSocket.emitSessionState({
                ...snapshot,
                snapshotData: snapshotStore.get(),
            });
        },
        [],
    );

    const loadAndPlay = useCallback(
        async (items: import('../api/types').PlaylistItem[]) => {
            await playlistPlayer.loadPlaylist(items, (url) =>
                mediaCache.resolvePlaybackUri(url),
            );
            reportSession(true);
        },
        [reportSession],
    );

    const handleControlCommand = useCallback(
        (command: ControlCommand) => {
            switch (command.command) {
                case 'play':
                    playlistPlayer.play();
                    break;
                case 'pause':
                    playlistPlayer.pause();
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
                        queryClient.invalidateQueries({
                            queryKey: playlistKeys.assigned(pairing.deviceId),
                        });
                        playlistsApi
                            .getAssignedPlaylist(pairing.deviceId)
                            .then((pl) => {
                                if (pl?.items?.length) {
                                    loadAndPlay(pl.items);
                                }
                            })
                            .catch(() => undefined);
                    }
                    break;
                default:
                    break;
            }
            reportSession(true);
        },
        [pairing?.deviceId, queryClient, reportSession, loadAndPlay],
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
                    queryKey: playlistKeys.assigned(pairing.deviceId),
                });
            }
        });
        const unsubControl = mediaSocket.onControl(handleControlCommand);

        return () => {
            unsubConn();
            unsubControl();
            mediaSocket.disconnect();
        };
    }, [pairing, handleControlCommand, queryClient]);

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
