import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../components/Text';
import { PairingCodeDisplay } from '../../components/PairingCodeDisplay';
import { SubscriptionExpiredScreen } from '../../components/SubscriptionExpiredScreen';
import { usePairing } from '../../lib/context/PairingContext';
import {
    usePairingStatus,
    usePairingCode,
    PAIRING_CODE_TTL_MS,
} from '../../lib/hooks';
import { colors, spacing } from '../../lib/theme/colors';
import { fonts } from '../../lib/theme/fonts';

function formatCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PairingScreen() {
    const router = useRouter();
    const { setPaired } = usePairing();
    const {
        deviceId,
        code,
        error,
        generating,
        codeGeneratedAt,
        refreshCode,
        setRefreshPaused,
    } = usePairingCode();
    const { data: status } = usePairingStatus(code, { enabled: !!code });
    const [countdownMs, setCountdownMs] = useState(PAIRING_CODE_TTL_MS);

    useEffect(() => {
        setRefreshPaused(status?.status === 'verified');
    }, [status?.status, setRefreshPaused]);

    useEffect(() => {
        if (status?.status === 'expired') {
            refreshCode();
        }
    }, [status?.status, refreshCode]);

    useEffect(() => {
        if (!codeGeneratedAt) return;

        const tick = () => {
            const elapsed = Date.now() - codeGeneratedAt;
            setCountdownMs(Math.max(0, PAIRING_CODE_TTL_MS - elapsed));
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [codeGeneratedAt]);

    const completePairing = useCallback(async () => {
        if (!status || status.status !== 'verified' || !deviceId) return;
        if (!status.clerkOrgId) return;

        await setPaired({
            deviceId,
            clerkOrgId: status.clerkOrgId,
            locationId: status.locationId ?? null,
            pairedAt: new Date().toISOString(),
        });
        router.replace('/(main)/player');
    }, [status, deviceId, setPaired, router]);

    useEffect(() => {
        if (status?.status === 'verified') {
            completePairing();
        }
    }, [status, completePairing]);

    if (status?.status === 'subscription_required') {
        return (
            <SubscriptionExpiredScreen
                upgradeUrl={status.upgradeUrl}
                context="pairing"
            />
        );
    }

    const hint =
        status?.status === 'pending'
            ? `Waiting for pairing… Refreshes in ${formatCountdown(countdownMs)}`
            : status?.status === 'verified'
              ? 'Paired! Starting…'
              : 'Code refreshes every 5 minutes';

    return (
        <View style={styles.container}>
            <Text style={styles.brand}>Kaast TV</Text>
            <Text style={styles.title}>Pair this device</Text>
            <Text style={styles.subtitle}>
                Open the Kaast mobile app, go to Devices, and enter this code
            </Text>

            {error ? (
                <Text style={styles.error}>{error}</Text>
            ) : (
                <PairingCodeDisplay code={code} loading={generating} />
            )}

            <Text style={styles.hint}>{hint}</Text>

            {deviceId ? (
                <Text style={styles.deviceId} numberOfLines={1}>
                    Device: {deviceId}
                </Text>
            ) : null}
        </View>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        padding: spacing.xl,
    },
    brand: {
        fontFamily: fonts.semibold,
        color: colors.primary,
        fontSize: 28,
        marginBottom: spacing.md,
    },
    title: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 36,
        marginBottom: spacing.sm,
    },
    subtitle: {
        color: colors.textMuted,
        fontSize: 20,
        textAlign: 'center' as const,
        marginBottom: spacing.xl,
        maxWidth: 640,
    },
    error: {
        color: colors.error,
        fontSize: 18,
        textAlign: 'center' as const,
        marginVertical: spacing.lg,
    },
    hint: {
        color: colors.textMuted,
        fontSize: 18,
        marginTop: spacing.lg,
        textAlign: 'center' as const,
    },
    deviceId: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: spacing.xl,
        maxWidth: '80%' as const,
    },
};
