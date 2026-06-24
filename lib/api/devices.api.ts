import { apiClient } from './client';
import type {
    DeviceSubscriptionStatus,
    GeneratePairingCodeResponse,
    PairingStatus,
} from './types';

export const devicesApi = {
    generatePairingCode: async (
        deviceId: string,
    ): Promise<GeneratePairingCodeResponse> => {
        const { data } = await apiClient.post<GeneratePairingCodeResponse>(
            '/devices/pairing-code',
            { deviceId },
        );
        return data;
    },

    getPairingStatus: async (code: string): Promise<PairingStatus> => {
        const { data } = await apiClient.get<PairingStatus>(
            `/pairing/${code}/status`,
        );
        return data;
    },

    getSubscriptionStatus: async (
        deviceId: string,
    ): Promise<DeviceSubscriptionStatus> => {
        const { data } = await apiClient.get<DeviceSubscriptionStatus>(
            `/devices/${deviceId}/subscription`,
        );
        return data;
    },
};
