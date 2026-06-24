import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { usePairing } from '../../lib/context/PairingContext';
import { mediaCache, formatBytes } from '../../lib/cache/media-cache';
import { mediaSocket } from '../../lib/ws/media-socket';
import { useMediaCacheStats } from '../../lib/hooks';
import { TVFocusableButton } from '../../components/TVFocusableButton';
import { colors, spacing } from '../../lib/theme/colors';
import { fonts } from '../../lib/theme/fonts';

export default function SettingsScreen() {
    const router = useRouter();
    const { pairing, clearPairing } = usePairing();
    const stats = useMediaCacheStats();
    const [clearing, setClearing] = useState(false);

    const handleClearCache = useCallback(async () => {
        setClearing(true);
        try {
            await mediaCache.clearAll();
        } finally {
            setClearing(false);
        }
    }, []);

    const handleRePair = useCallback(async () => {
        mediaSocket.disconnect();
        await clearPairing();
        router.replace('/(pairing)');
    }, [clearPairing, router]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Device</Text>
                <Text style={styles.value}>
                    {pairing ? 'Connected' : 'Not paired'}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session cache</Text>
                <Text style={styles.value}>
                    {stats.itemCount} items tracked ·{' '}
                    {formatBytes(stats.totalBytes)} estimated
                </Text>
                <Text style={styles.meta}>
                    Media streams from the network. Cache is in memory only and
                    clears when the app restarts.
                </Text>
                <TVFocusableButton
                    label={clearing ? 'Clearing…' : 'Clear cache'}
                    onPress={handleClearCache}
                    disabled={clearing}
                    hasTVPreferredFocus
                    style={styles.button}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pairing</Text>
                <TVFocusableButton
                    label="Re-pair device"
                    variant="primary"
                    onPress={() => {
                        Alert.alert(
                            'Re-pair device?',
                            'You will need to enter a new pairing code from the mobile app.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Re-pair', onPress: handleRePair },
                            ],
                        );
                    }}
                    style={styles.button}
                />
            </View>

            <TVFocusableButton
                label="Back to library"
                onPress={() => router.back()}
                style={styles.backButton}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
    },
    title: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 32,
        marginBottom: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    sectionTitle: {
        fontFamily: fonts.medium,
        color: colors.textMuted,
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    value: {
        color: colors.text,
        fontSize: 20,
    },
    meta: {
        color: colors.textMuted,
        fontSize: 14,
    },
    button: {
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginTop: spacing.lg,
    },
});
