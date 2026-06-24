import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Text } from '../../components/Text';
import { usePlayback } from '../../lib/context/PlaybackContext';
import { playlistPlayer } from '../../lib/playback/playlist-player';
import { useAssignedPlaylist } from '../../lib/hooks';
import { usePairing } from '../../lib/context/PairingContext';
import { snapshotStore } from '../../lib/snapshot/snapshot-store';
import { colors, spacing } from '../../lib/theme/colors';
import { fonts } from '../../lib/theme/fonts';
import { formatDurationShort } from '../../lib/utils/media';

const KEEP_AWAKE_TAG = 'kaast-tv-player';
const SNAPSHOT_INTERVAL_MS = 10_000;
const OVERLAY_HIDE_DELAY_MS = 5_000;

export default function PlayerScreen() {
    const router = useRouter();
    const { pairing } = usePairing();
    const { playbackState, loadAndPlay } = usePlayback();
    const { data: scheduled } = useAssignedPlaylist(pairing?.deviceId);
    const playlist = scheduled?.playlist ?? null;
    const imageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const captureViewRef = useRef<View>(null);
    const overlayHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayOpacity = useRef(new Animated.Value(1)).current;
    const [overlayVisible, setOverlayVisible] = useState(true);
    const [mediaLoadError, setMediaLoadError] = useState<string | null>(null);
    const loadedSourceKeyRef = useRef<string | null>(null);

    const currentItem = playbackState.currentItem;
    const isImage = playlistPlayer.isImageItem(currentItem);
    const isAudio = playlistPlayer.isAudioItem(currentItem);
    const usesMediaPlayer = playlistPlayer.isMediaPlayerItem(currentItem);
    const mediaUri = currentItem?.playbackUri ?? null;
    const sourceKey = `${playbackState.currentIndex}:${mediaUri ?? ''}`;

    const player = useVideoPlayer(null, (p) => {
        p.loop = false;
        p.volume = playbackState.volume;
    });

    const showOverlay = useCallback(() => {
        if (overlayHideTimerRef.current) {
            clearTimeout(overlayHideTimerRef.current);
            overlayHideTimerRef.current = null;
        }
        setOverlayVisible(true);
        Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [overlayOpacity]);

    const scheduleOverlayHide = useCallback(() => {
        if (overlayHideTimerRef.current) {
            clearTimeout(overlayHideTimerRef.current);
        }
        overlayHideTimerRef.current = setTimeout(() => {
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setOverlayVisible(false);
            });
        }, OVERLAY_HIDE_DELAY_MS);
    }, [overlayOpacity]);

    useEffect(() => {
        activateKeepAwakeAsync(KEEP_AWAKE_TAG);
        return () => {
            deactivateKeepAwake(KEEP_AWAKE_TAG);
        };
    }, []);

    useEffect(() => {
        showOverlay();
        if (playbackState.playing) {
            scheduleOverlayHide();
        }
        return () => {
            if (overlayHideTimerRef.current) {
                clearTimeout(overlayHideTimerRef.current);
            }
        };
    }, [
        playbackState.currentIndex,
        showOverlay,
        scheduleOverlayHide,
        playbackState.playing,
    ]);

    useEffect(() => {
        if (!playbackState.playing) {
            showOverlay();
            return;
        }
        scheduleOverlayHide();
    }, [playbackState.playing, showOverlay, scheduleOverlayHide]);

    useEffect(() => {
        if (!player) return;
        player.volume = playbackState.volume;
    }, [player, playbackState.volume]);

    useEffect(() => {
        setMediaLoadError(null);
    }, [sourceKey]);

    useEffect(() => {
        if (!player) return;

        if (isImage) {
            player.pause();
            loadedSourceKeyRef.current = null;
            return;
        }

        if (!usesMediaPlayer || !mediaUri) return;
        if (loadedSourceKeyRef.current === sourceKey) return;

        let cancelled = false;
        loadedSourceKeyRef.current = sourceKey;

        void (async () => {
            try {
                await player.replaceAsync(mediaUri);
                if (cancelled) return;

                setMediaLoadError(null);

                const position = playlistPlayer.getState().position;
                if (position > 0) {
                    player.currentTime = position;
                }

                const duration =
                    player.duration > 0
                        ? player.duration
                        : playlistPlayer.getState().duration;
                playlistPlayer.setPosition(player.currentTime, duration);

                if (playlistPlayer.getState().playing) {
                    player.play();
                } else {
                    player.pause();
                }
            } catch (err) {
                if (!cancelled) {
                    loadedSourceKeyRef.current = null;
                    playlistPlayer.pause();
                    setMediaLoadError(
                        err instanceof Error ? err.message : 'Failed to load media',
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [player, isImage, usesMediaPlayer, mediaUri, sourceKey]);

    useEffect(() => {
        if (!player || isImage) return;
        if (playbackState.playing) player.play();
        else player.pause();
    }, [playbackState.playing, player, isImage]);

    useEffect(() => {
        if (!player || isImage) return;
        const diff = Math.abs(player.currentTime - playbackState.position);
        if (diff > 1.5) {
            player.currentTime = playbackState.position;
        }
    }, [playbackState.position, player, isImage]);

    useEffect(() => {
        if (!player) return;

        const endSub = player.addListener('playToEnd', () => {
            playlistPlayer.onItemEnded();
        });
        const timeSub = player.addListener('timeUpdate', (payload) => {
            const duration =
                player.duration > 0
                    ? player.duration
                    : playlistPlayer.getState().duration;
            playlistPlayer.setPosition(payload.currentTime, duration);
        });
        const statusSub = player.addListener('statusChange', ({ status, error }) => {
            if (status === 'readyToPlay') {
                const duration =
                    player.duration > 0
                        ? player.duration
                        : playlistPlayer.getState().duration;
                playlistPlayer.setPosition(player.currentTime, duration);
                if (playlistPlayer.getState().playing) {
                    player.play();
                }
            }
            if (status === 'error') {
                const message = error?.message ?? 'Playback failed';
                console.warn('[TV Player] Media load error:', message);
                loadedSourceKeyRef.current = null;
                playlistPlayer.pause();
                setMediaLoadError(message);
            }
        });

        return () => {
            endSub.remove();
            timeSub.remove();
            statusSub.remove();
        };
    }, [player, playbackState.currentIndex]);

    useEffect(() => {
        if (imageTimerRef.current) {
            clearInterval(imageTimerRef.current);
            imageTimerRef.current = null;
        }
        if (!isImage || !currentItem || !playbackState.playing) return;

        const duration = playbackState.duration || 10;
        imageTimerRef.current = setInterval(() => {
            const next = playlistPlayer.getState().position + 1;
            if (next >= duration) {
                playlistPlayer.onItemEnded();
            } else {
                playlistPlayer.setPosition(next, duration);
            }
        }, 1000);

        return () => {
            if (imageTimerRef.current) clearInterval(imageTimerRef.current);
        };
    }, [
        isImage,
        currentItem,
        playbackState.playing,
        playbackState.duration,
        playbackState.currentIndex,
    ]);

    useEffect(() => {
        if (
            playlist?.items?.length &&
            playbackState.items.length === 0
        ) {
            loadAndPlay(playlist.items, {
                playlistId: playlist.id,
                scheduleId: scheduled?.schedule?.id ?? null,
                loop: scheduled?.schedule?.loopPlaylist ?? true,
            });
        }
    }, [playlist, scheduled?.schedule, playbackState.items.length, loadAndPlay]);

    useEffect(() => {
        return () => {
            snapshotStore.clear();
        };
    }, []);

    const captureSnapshot = useCallback(async () => {
        if (!captureViewRef.current) return;
        try {
            const base64 = await captureRef(captureViewRef, {
                format: 'jpg',
                quality: 0.5,
                result: 'base64',
                width: 640,
            });
            snapshotStore.set(base64);
        } catch {
            // Ignore capture failures during transitions
        }
    }, []);

    useEffect(() => {
        void captureSnapshot();
        const interval = setInterval(() => {
            void captureSnapshot();
        }, SNAPSHOT_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [captureSnapshot, playbackState.currentIndex, mediaUri]);

    const handleBack = useCallback(() => {
        playlistPlayer.pause();
        router.back();
    }, [router]);

    const handleContainerFocus = useCallback(() => {
        showOverlay();
        if (playbackState.playing) {
            scheduleOverlayHide();
        }
    }, [showOverlay, scheduleOverlayHide, playbackState.playing]);

    if (!currentItem) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading playlist…</Text>
            </View>
        );
    }

    const displayTitle = currentItem.title ?? currentItem.mediaUrl;

    return (
        <View
            style={styles.container}
            onFocus={handleContainerFocus}
            focusable
        >
            <View ref={captureViewRef} style={styles.captureArea} collapsable={false}>
                {isImage ? (
                    <Image
                        source={{ uri: mediaUri! }}
                        style={styles.media}
                        contentFit="cover"
                    />
                ) : (
                    <>
                        {mediaLoadError ? (
                            <View style={styles.errorBackdrop}>
                                <Text style={styles.errorTitle}>Unable to play media</Text>
                                <Text style={styles.errorMessage} numberOfLines={4}>
                                    {mediaLoadError}
                                </Text>
                                <Text style={styles.errorHint} numberOfLines={2}>
                                    {currentItem.mediaUrl}
                                </Text>
                            </View>
                        ) : null}
                        {isAudio ? (
                            <View style={styles.audioBackdrop}>
                                <Text style={styles.audioTitle} numberOfLines={3}>
                                    {displayTitle}
                                </Text>
                                <Text style={styles.audioLabel}>Now playing</Text>
                            </View>
                        ) : null}
                        <VideoView
                            player={player}
                            style={isAudio ? styles.hiddenVideo : styles.media}
                            contentFit="cover"
                            nativeControls={false}
                        />
                    </>
                )}
            </View>

            {(overlayVisible || !playbackState.playing) && (
                <Animated.View
                    style={[styles.overlay, { opacity: overlayOpacity }]}
                    pointerEvents={overlayVisible ? 'auto' : 'none'}
                >
                    <Text style={styles.title} numberOfLines={1}>
                        {displayTitle}
                    </Text>
                    <Text style={styles.meta}>
                        {playbackState.currentIndex + 1} / {playbackState.items.length}{' '}
                        · {formatDurationShort(playbackState.position)} /{' '}
                        {formatDurationShort(playbackState.duration)} ·{' '}
                        {playbackState.playing ? 'Playing' : 'Paused'}
                    </Text>
                    <Text style={styles.backHint} onPress={handleBack}>
                        Press Back to return to library
                    </Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    loadingText: {
        color: colors.textMuted,
        fontSize: 18,
    },
    media: {
        ...StyleSheet.absoluteFill,
    },
    hiddenVideo: {
        ...StyleSheet.absoluteFill,
        opacity: 0,
    },
    captureArea: {
        flex: 1,
        width: '100%',
        overflow: 'hidden',
    },
    audioBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl * 2,
        gap: spacing.md,
    },
    audioTitle: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 36,
        textAlign: 'center',
    },
    audioLabel: {
        color: colors.textMuted,
        fontSize: 18,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    errorBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl * 2,
        gap: spacing.md,
    },
    errorTitle: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 28,
        textAlign: 'center',
    },
    errorMessage: {
        color: colors.textMuted,
        fontSize: 18,
        textAlign: 'center',
    },
    errorHint: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
    },
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: spacing.xl,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    title: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 24,
    },
    meta: {
        color: colors.textMuted,
        fontSize: 16,
        marginTop: spacing.xs,
    },
    backHint: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: spacing.sm,
    },
});
