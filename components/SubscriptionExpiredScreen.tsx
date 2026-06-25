import { TvStandbyScreen } from './TvStandbyScreen';

interface SubscriptionExpiredScreenProps {
    upgradeUrl?: string;
    /** Pairing flow vs already-paired playback */
    context?: 'pairing' | 'playback';
    onRefresh?: () => void;
    refreshing?: boolean;
}

export function SubscriptionExpiredScreen({
    upgradeUrl,
    context = 'playback',
    onRefresh,
    refreshing = false,
}: SubscriptionExpiredScreenProps) {
    return (
        <TvStandbyScreen
            reason={
                context === 'pairing'
                    ? 'pairing_subscription'
                    : 'subscription_ended'
            }
            upgradeUrl={upgradeUrl}
            onAction={onRefresh}
            actionLabel={onRefresh ? 'Check again' : undefined}
            actionLoading={refreshing}
        />
    );
}
