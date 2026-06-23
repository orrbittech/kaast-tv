let latestSnapshotData: string | null = null;

export const snapshotStore = {
    get(): string | null {
        return latestSnapshotData;
    },
    set(data: string | null): void {
        latestSnapshotData = data;
    },
    clear(): void {
        latestSnapshotData = null;
    },
};
