import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    TVFocusGuideView,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { usePairing } from '../../lib/context/PairingContext';
import { usePlayback } from '../../lib/context/PlaybackContext';
import { mediaCache } from '../../lib/cache/media-cache';
import {
    useAssignedPlaylist,
    useMediaCacheStatus,
} from '../../lib/hooks';
import type { PlaylistItem } from '../../lib/api/types';
import { TVFocusableButton } from '../../components/TVFocusableButton';
import {
    formatDurationShort,
    getDisplayTitle,
    getMediaTypeForFilter,
} from '../../lib/utils/media';
import { colors, spacing } from '../../lib/theme/colors';
import { fonts } from '../../lib/theme/fonts';

function CacheBadge({ mediaUrl }: { mediaUrl: string }) {
    const status = useMediaCacheStatus(mediaUrl);
    const label =
        status === 'cached'
            ? 'Ready'
            : status === 'downloading'
              ? 'Checking'
              : status === 'error'
                ? 'Error'
                : 'Pending';
    const color =
        status === 'cached'
            ? colors.success
            : status === 'downloading'
              ? colors.warning
              : status === 'error'
                ? colors.error
                : colors.textMuted;

    return <Text style={[styles.badge, { color }]}>{label}</Text>;
}

function PlaylistItemRow({
    item,
    onPress,
}: {
    item: PlaylistItem;
    onPress: () => void;
}) {
    const [focused, setFocused] = useState(false);
    const mediaType = getMediaTypeForFilter(item);

    return (
        <Pressable
            onPress={onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.row, focused && styles.rowFocused]}
        >
            <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                    {getDisplayTitle(item)}
                </Text>
                <View style={styles.rowMeta}>
                    <Text style={styles.typeBadge}>{mediaType}</Text>
                    <Text style={styles.duration}>
                        {formatDurationShort(item.duration ?? undefined)}
                    </Text>
                    <CacheBadge mediaUrl={item.mediaUrl} />
                </View>
            </View>
        </Pressable>
    );
}

export default function LibraryScreen() {
    const router = useRouter();
    const { pairing } = usePairing();
    const { loadAndPlay } = usePlayback();
    const { data: playlist, isLoading, refetch, isRefetching } =
        useAssignedPlaylist(pairing?.deviceId);

    const items = useMemo(
        () => [...(playlist?.items ?? [])].sort((a, b) => a.order - b.order),
        [playlist?.items],
    );

    const canPlay = items.length > 0;

    const handlePlay = useCallback(async () => {
        if (!canPlay) return;
        await loadAndPlay(items);
        router.push('/(main)/player');
    }, [canPlay, items, loadAndPlay, router]);

    useEffect(() => {
        if (!playlist?.items?.length) return;
        void mediaCache.syncPlaylistItems(
            playlist.items.map((i) => ({ id: i.id, mediaUrl: i.mediaUrl })),
        );
    }, [playlist?.id, playlist?.items]);

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>KAAST</Text>
                    <Text style={styles.subtitle}>Multimedia Management</Text>
                </View>
                <TVFocusGuideView
                    style={styles.actions}
                    trapFocusLeft
                    trapFocusRight
                >
                    <TVFocusableButton
                        label="Play"
                        variant="primary"
                        onPress={handlePlay}
                        disabled={!canPlay}
                        hasTVPreferredFocus={!!playlist}
                    />
                </TVFocusGuideView>
            </View>

            {!playlist ? (
                <TVFocusGuideView style={styles.empty}>
                    <Text style={styles.emptyTitle}>No playlist assigned</Text>
                    <Text style={styles.emptyText}>
                        Use the Kaast mobile app to assign a playlist to this
                        device.
                    </Text>
                    <TVFocusableButton
                        label={isRefetching ? 'Checking…' : 'Refresh'}
                        onPress={() => refetch()}
                        hasTVPreferredFocus
                        style={{ marginTop: spacing.lg }}
                    />
                </TVFocusGuideView>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <PlaylistItemRow
                            item={item}
                            onPress={handlePlay}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
    },
    centered: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
        gap: spacing.lg,
    },
    title: {
        fontFamily: fonts.brand,
        color: colors.text,
        fontSize: 32,
        letterSpacing: 1,
    },
    subtitle: {
        color: colors.textMuted,
        fontSize: 16,
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    list: {
        paddingBottom: spacing.xl,
        gap: spacing.sm,
    },
    row: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: spacing.sm,
    },
    rowFocused: {
        borderColor: colors.borderFocused,
        backgroundColor: colors.surfaceFocused,
    },
    rowContent: {
        gap: spacing.xs,
    },
    rowTitle: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 22,
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    typeBadge: {
        color: colors.textMuted,
        fontSize: 14,
        textTransform: 'uppercase',
    },
    duration: {
        color: colors.textMuted,
        fontSize: 14,
    },
    badge: {
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 28,
        marginBottom: spacing.sm,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 520,
    },
});
