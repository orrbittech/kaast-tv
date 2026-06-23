import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { PairingContext } from '../api/types';
import {
    clearPairingContext,
    getPairingContext,
    savePairingContext,
} from '../storage/pairing-store';

interface PairingContextValue {
    pairing: PairingContext | null;
    isLoading: boolean;
    setPaired: (context: PairingContext) => Promise<void>;
    clearPairing: () => Promise<void>;
    refresh: () => Promise<void>;
}

const PairingStoreContext = createContext<PairingContextValue | null>(null);

export function PairingProvider({ children }: { children: ReactNode }) {
    const [pairing, setPairing] = useState<PairingContext | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        const ctx = await getPairingContext();
        setPairing(ctx);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const setPaired = useCallback(async (context: PairingContext) => {
        await savePairingContext(context);
        setPairing(context);
    }, []);

    const clearPairing = useCallback(async () => {
        await clearPairingContext();
        setPairing(null);
    }, []);

    const value = useMemo(
        () => ({ pairing, isLoading, setPaired, clearPairing, refresh }),
        [pairing, isLoading, setPaired, clearPairing, refresh],
    );

    return (
        <PairingStoreContext.Provider value={value}>
            {children}
        </PairingStoreContext.Provider>
    );
}

export function usePairing(): PairingContextValue {
    const ctx = useContext(PairingStoreContext);
    if (!ctx) throw new Error('usePairing must be used within PairingProvider');
    return ctx;
}
