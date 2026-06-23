import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { mediaCache } from '../cache/media-cache';
import type { CacheStatus } from '../api/types';

export function useMediaCacheStatus(mediaUrl: string): CacheStatus {
    const subscribe = useCallback(
        (onStoreChange: () => void) => mediaCache.subscribe(onStoreChange),
        [],
    );
    const getSnapshot = useCallback(() => {
        // snapshot is updated via subscribe notifications; read async status lazily
        return mediaUrl;
    }, [mediaUrl]);

    useSyncExternalStore(subscribe, getSnapshot);

    const [status, setStatus] = useState<CacheStatus>('pending');

    useEffect(() => {
        let active = true;
        mediaCache.getStatus(mediaUrl).then((s) => {
            if (active) setStatus(s);
        });
        return () => {
            active = false;
        };
    }, [mediaUrl, subscribe]);

    return status;
}

export function useMediaCacheStats() {
    const [stats, setStats] = useState({ totalBytes: 0, itemCount: 0 });

    useEffect(() => {
        let active = true;
        const refresh = () => {
            mediaCache.getCacheStats().then((s) => {
                if (active) setStats(s);
            });
        };
        refresh();
        return mediaCache.subscribe(refresh);
    }, []);

    return stats;
}

export function useMediaCacheInit() {
    useEffect(() => {
        mediaCache.init().catch(() => undefined);
    }, []);
}
