import type { CacheStatus, CachedMediaEntry } from '../api/types';
import { validateMediaUrl as probeMediaUrl, isImageUrl } from '../utils/media';

type CacheListener = () => void;

class MediaCacheService {
    private entries = new Map<string, CachedMediaEntry>();
    private listeners = new Set<CacheListener>();
    private initialized = false;

    subscribe(listener: CacheListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach((l) => l());
    }

    async init(): Promise<void> {
        this.initialized = true;
    }

    async getEntry(mediaUrl: string): Promise<CachedMediaEntry | null> {
        await this.init();
        return this.entries.get(mediaUrl) ?? null;
    }

    async getAllEntries(): Promise<CachedMediaEntry[]> {
        await this.init();
        return Array.from(this.entries.values()).sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }

    async getStatus(mediaUrl: string): Promise<CacheStatus> {
        const entry = await this.getEntry(mediaUrl);
        return entry?.status ?? 'pending';
    }

    async resolvePlaybackUri(mediaUrl: string): Promise<string> {
        if (isImageUrl(mediaUrl)) {
            return mediaUrl;
        }

        const validation = await this.validateMediaUrl(mediaUrl);
        if (!validation.ok) {
            throw new Error(validation.error ?? 'Media URL is not playable');
        }
        return mediaUrl;
    }

    async validateMediaUrl(mediaUrl: string): Promise<{ ok: boolean; error?: string }> {
        await this.init();
        const cached = this.entries.get(mediaUrl);
        if (cached?.status === 'cached') {
            return { ok: true };
        }
        if (cached?.status === 'error' && cached.error && !isImageUrl(mediaUrl)) {
            return { ok: false, error: cached.error };
        }

        const result = await probeMediaUrl(mediaUrl);
        this.upsertEntry(mediaUrl, {
            status: result.ok ? 'cached' : 'error',
            error: result.ok ? null : result.error ?? 'Validation failed',
        });
        return result;
    }

    private upsertEntry(
        mediaUrl: string,
        fields: Partial<{
            playlistItemId: string;
            bytes: number;
            status: CacheStatus;
            error: string | null;
        }>,
    ): void {
        const now = new Date().toISOString();
        const existing = this.entries.get(mediaUrl);

        this.entries.set(mediaUrl, {
            mediaUrl,
            playlistItemId: fields.playlistItemId ?? existing?.playlistItemId,
            localUri: null,
            bytes: fields.bytes ?? existing?.bytes ?? 0,
            status: fields.status ?? existing?.status ?? 'pending',
            updatedAt: now,
            error: fields.error ?? existing?.error,
        });
        this.notify();
    }

    async enqueueDownload(
        mediaUrl: string,
        playlistItemId?: string,
    ): Promise<void> {
        await this.init();
        const entry = await this.getEntry(mediaUrl);
        if (entry?.status === 'cached' || entry?.status === 'downloading') {
            if (
                playlistItemId &&
                entry.playlistItemId &&
                entry.playlistItemId !== playlistItemId
            ) {
                await this.invalidate(mediaUrl);
            } else {
                return;
            }
        }

        this.upsertEntry(mediaUrl, {
            playlistItemId,
            status: 'downloading',
            error: null,
        });

        try {
            const validation = await this.validateMediaUrl(mediaUrl);
            const bytes = Number(
                (await fetch(mediaUrl, { method: 'HEAD', redirect: 'follow' })).headers.get(
                    'content-length',
                ) ?? 0,
            );
            this.upsertEntry(mediaUrl, {
                playlistItemId,
                bytes: validation.ok && Number.isFinite(bytes) ? bytes : 0,
                status: validation.ok ? 'cached' : 'error',
                error: validation.ok ? null : validation.error ?? 'Validation failed',
            });
        } catch (err) {
            this.upsertEntry(mediaUrl, {
                playlistItemId,
                status: 'error',
                error: err instanceof Error ? err.message : 'Validation failed',
            });
        }
    }

    async syncPlaylistItems(
        items: Array<{ id: string; mediaUrl: string }>,
    ): Promise<void> {
        await Promise.all(
            items.map((item) => this.enqueueDownload(item.mediaUrl, item.id)),
        );
    }

    async invalidate(mediaUrl: string): Promise<void> {
        this.entries.delete(mediaUrl);
        this.notify();
    }

    async clearAll(): Promise<void> {
        await this.init();
        this.entries.clear();
        this.notify();
    }

    async getCacheStats(): Promise<{ totalBytes: number; itemCount: number }> {
        await this.init();
        let totalBytes = 0;
        let itemCount = 0;
        for (const entry of this.entries.values()) {
            if (entry.status === 'cached') {
                totalBytes += entry.bytes;
                itemCount += 1;
            }
        }
        return { totalBytes, itemCount };
    }
}

export const mediaCache = new MediaCacheService();

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
