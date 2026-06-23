import { useCallback, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
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

export default function PlayerScreen() {
    const router = useRouter();
    const { pairing } = usePairing();
    const { playbackState, loadAndPlay } = usePlayback();
    const { data: playlist } = useAssignedPlaylist(pairing?.deviceId);
    const imageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const captureViewRef = useRef<View>(null);

    const currentItem = playbackState.currentItem;
    const isImage = playlistPlayer.isImageItem(currentItem);
    const mediaUri = currentItem?.playbackUri ?? null;

    const player = useVideoPlayer(isImage ? null : mediaUri, (p) => {
        p.loop = false;
        p.volume = playbackState.volume;
    });

    useEffect(() => {
        activateKeepAwakeAsync(KEEP_AWAKE_TAG);
        return () => {
            deactivateKeepAwake(KEEP_AWAKE_TAG);
        };
    }, []);

    useEffect(() => {
        if (!player || isImage) return;
        player.volume = playbackState.volume;
    }, [player, playbackState.volume, isImage]);

    useEffect(() => {
        if (!player || isImage || !mediaUri) return;
        player.replace(mediaUri);
        if (playbackState.playing) {
            player.play();
        } else {
            player.pause();
        }
    }, [mediaUri, player, isImage, playbackState.playing, playbackState.currentIndex]);

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
        if (!player || isImage) return;

        const endSub = player.addListener('playToEnd', () => {
            playlistPlayer.onItemEnded();
        });
        const timeSub = player.addListener('timeUpdate', (payload) => {
            playlistPlayer.setPosition(
                payload.currentTime,
                payload.duration ?? playlistPlayer.getState().duration,
            );
        });

        return () => {
            endSub.remove();
            timeSub.remove();
        };
    }, [player, isImage, playbackState.currentIndex]);

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
            loadAndPlay(playlist.items);
        }
    }, [playlist, playbackState.items.length, loadAndPlay]);

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

    if (!currentItem) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading playlist…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View ref={captureViewRef} style={styles.captureArea} collapsable={false}>
                {isImage ? (
                    <Image
                        source={{ uri: mediaUri! }}
                        style={styles.media}
                        contentFit="contain"
                    />
                ) : (
                    <VideoView
                        player={player}
                        style={styles.media}
                        contentFit="contain"
                        nativeControls={false}
                    />
                )}
            </View>

            <View style={styles.overlay}>
                <Text style={styles.title} numberOfLines={1}>
                    {currentItem.title ?? currentItem.mediaUrl}
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
            </View>
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
        flex: 1,
        width: '100%',
    },
    captureArea: {
        flex: 1,
        width: '100%',
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
