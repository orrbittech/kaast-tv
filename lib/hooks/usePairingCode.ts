import { useCallback, useEffect, useRef, useState } from 'react';
import { devicesApi } from '../api/devices.api';
import { getOrCreateDeviceId } from '../storage/pairing-store';

/** Matches server CACHE_TTL.pairingPending (5 minutes). */
export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

interface UsePairingCodeResult {
    deviceId: string | null;
    code: string | null;
    error: string | null;
    generating: boolean;
    codeGeneratedAt: number | null;
    refreshCode: () => Promise<void>;
    setRefreshPaused: (paused: boolean) => void;
}

export function usePairingCode(): UsePairingCodeResult {
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [code, setCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(true);
    const [codeGeneratedAt, setCodeGeneratedAt] = useState<number | null>(null);
    const deviceIdRef = useRef<string | null>(null);
    const pausedRef = useRef(false);

    const generateCode = useCallback(async (id: string) => {
        setGenerating(true);
        setError(null);
        try {
            const { code: pairingCode } = await devicesApi.generatePairingCode(id);
            setCode(pairingCode);
            setCodeGeneratedAt(Date.now());
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to generate pairing code',
            );
        } finally {
            setGenerating(false);
        }
    }, []);

    const refreshCode = useCallback(async () => {
        const id = deviceIdRef.current;
        if (!id || pausedRef.current) return;
        await generateCode(id);
    }, [generateCode]);

    const setRefreshPaused = useCallback((paused: boolean) => {
        pausedRef.current = paused;
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const id = await getOrCreateDeviceId();
                if (!active) return;
                deviceIdRef.current = id;
                setDeviceId(id);
                await generateCode(id);
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to initialize device',
                    );
                    setGenerating(false);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [generateCode]);

    useEffect(() => {
        if (!deviceId || !code) return;

        const interval = setInterval(() => {
            if (!pausedRef.current) {
                refreshCode();
            }
        }, PAIRING_CODE_TTL_MS);

        return () => clearInterval(interval);
    }, [deviceId, code, refreshCode]);

    return {
        deviceId,
        code,
        error,
        generating,
        codeGeneratedAt,
        refreshCode,
        setRefreshPaused,
    };
}
