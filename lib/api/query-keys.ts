export const pairingKeys = {
    all: ['pairing'] as const,
    status: (code: string) => [...pairingKeys.all, 'status', code] as const,
};

export const playlistKeys = {
    all: ['playlists'] as const,
    assigned: (deviceId: string) =>
        [...playlistKeys.all, 'assigned', deviceId] as const,
    scheduled: (deviceId: string) =>
        [...playlistKeys.all, 'scheduled', deviceId] as const,
};
