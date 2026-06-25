import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { TVFocusableButton } from './TVFocusableButton';
import {
    billingUrl,
    formatBillingUrlForDisplay,
} from '../lib/billing-config';
import { colors, spacing } from '../lib/theme/colors';
import { fonts } from '../lib/theme/fonts';

const APP_ICON = require('../assets/images/icon.png');

export type StandbyReason =
    | 'loading'
    | 'no_playlist'
    | 'nothing_playing'
    | 'subscription_ended'
    | 'pairing_subscription';

interface TvStandbyScreenProps {
    reason: StandbyReason;
    /** Override the default message for this reason */
    message?: string;
    upgradeUrl?: string;
    onAction?: () => void;
    actionLabel?: string;
    actionLoading?: boolean;
}

function resolveMessage(
    reason: StandbyReason,
    upgradeUrl?: string,
): string | undefined {
    const displayUrl = formatBillingUrlForDisplay(upgradeUrl ?? billingUrl);

    switch (reason) {
        case 'loading':
            return 'Loading…';
        case 'no_playlist':
            return 'No playlist scheduled for this TV. Assign one in the KAAST mobile app.';
        case 'nothing_playing':
            return 'Nothing is playing. Waiting for a scheduled playlist.';
        case 'subscription_ended':
            return `Subscription ended. Subscribe in the KAAST app or at ${displayUrl}, then press Check again.`;
        case 'pairing_subscription':
            return `Subscription ended. Subscribe at ${displayUrl} on your phone or web, then pair this TV again.`;
        default: {
            const _exhaustive: never = reason;
            return _exhaustive;
        }
    }
}

/**
 * Google TV–style standby / screensaver screen.
 * Centered brand row (icon + kaast) with a human-readable status message below.
 */
export function TvStandbyScreen({
    reason,
    message,
    upgradeUrl,
    onAction,
    actionLabel,
    actionLoading = false,
}: TvStandbyScreenProps) {
    const displayMessage = message ?? resolveMessage(reason, upgradeUrl);

    return (
        <View style={styles.container}>
            <View style={styles.brandRow}>
                <Image
                    source={APP_ICON}
                    style={styles.icon}
                    contentFit="contain"
                />
                <Text style={styles.wordmark}>kaast</Text>
            </View>

            {displayMessage ? (
                <Text style={styles.message}>{displayMessage}</Text>
            ) : null}

            {reason === 'loading' ? (
                <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={styles.spinner}
                />
            ) : null}

            {onAction && actionLabel ? (
                <TVFocusableButton
                    label={actionLoading ? `${actionLabel}…` : actionLabel}
                    variant="primary"
                    onPress={onAction}
                    disabled={actionLoading}
                    hasTVPreferredFocus
                    style={styles.action}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    icon: {
        width: 72,
        height: 72,
        borderRadius: 16,
    },
    wordmark: {
        fontFamily: fonts.brand,
        color: colors.primary,
        fontSize: 56,
        lineHeight: 64,
    },
    message: {
        marginTop: spacing.lg,
        color: colors.textMuted,
        fontSize: 20,
        textAlign: 'center',
        maxWidth: 560,
        lineHeight: 28,
    },
    action: {
        marginTop: spacing.xl,
    },
    spinner: {
        marginTop: spacing.lg,
    },
});
