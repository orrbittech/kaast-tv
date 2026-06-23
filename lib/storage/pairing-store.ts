import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import type { PairingContext } from '../api/types';

const DEVICE_ID_KEY = 'kaast_device_id';
const PAIRING_CONTEXT_KEY = 'kaast_pairing_context';

async function generateFallbackDeviceId(): Promise<string> {
    const random = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(random)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return `kaast-${hex}`;
}

/** Stable device identifier persisted across launches. */
export async function getOrCreateDeviceId(): Promise<string> {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;

    let deviceId: string | null = null;
    if (Application.getAndroidId) {
        deviceId = Application.getAndroidId();
    }
    if (!deviceId) {
        deviceId = await generateFallbackDeviceId();
    }

    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    return deviceId;
}

export async function getPairingContext(): Promise<PairingContext | null> {
    const raw = await SecureStore.getItemAsync(PAIRING_CONTEXT_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as PairingContext & { orgRef?: string };
        if (!parsed.clerkOrgId && parsed.orgRef) {
            parsed.clerkOrgId = parsed.orgRef;
        }
        if (!parsed.clerkOrgId) return null;
        return parsed;
    } catch {
        return null;
    }
}

export async function savePairingContext(context: PairingContext): Promise<void> {
    await SecureStore.setItemAsync(PAIRING_CONTEXT_KEY, JSON.stringify(context));
}

export async function clearPairingContext(): Promise<void> {
    await SecureStore.deleteItemAsync(PAIRING_CONTEXT_KEY);
}
