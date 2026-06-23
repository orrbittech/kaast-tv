import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

/**
 * Checks for OTA updates on launch (production builds only).
 * Downloads and reloads silently before the app UI is shown.
 */
export function useSilentUpdates() {
    const [isReady, setIsReady] = useState(__DEV__);

    useEffect(() => {
        if (__DEV__) {
            return;
        }

        let cancelled = false;

        async function ensureLatestUpdate() {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (cancelled) return;

                if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    if (cancelled) return;
                    await Updates.reloadAsync();
                    return;
                }
            } catch {
                // Fall through to cached bundle on network or server errors.
            }

            if (!cancelled) {
                setIsReady(true);
            }
        }

        void ensureLatestUpdate();

        return () => {
            cancelled = true;
        };
    }, []);

    return isReady;
}
