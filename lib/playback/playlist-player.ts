import type { PlaylistItem } from '../api/types';
import {
    DEFAULT_IMAGE_DURATION_SEC,
    getMediaTypeForFilter,
    isImageUrl,
} from '../utils/media';

export interface PlaybackItem extends PlaylistItem {
    playbackUri: string;
    mediaType: ReturnType<typeof getMediaTypeForFilter>;
}

export interface PlaybackState {
    items: PlaybackItem[];
    currentIndex: number;
    playing: boolean;
    position: number;
    duration: number;
    volume: number;
    loop: boolean;
    currentItem: PlaybackItem | null;
    playlistId: string | null;
    scheduleId: string | null;
}

export type PlaybackListener = (state: PlaybackState) => void;

export interface LoadPlaylistOptions {
    startIndex?: number;
    startPosition?: number;
    loop?: boolean;
    playing?: boolean;
    playlistId?: string | null;
    scheduleId?: string | null;
}

function sortItems(items: PlaylistItem[]): PlaylistItem[] {
    return [...items].sort((a, b) => a.order - b.order);
}

export class PlaylistPlayerEngine {
    private state: PlaybackState = {
        items: [],
        currentIndex: 0,
        playing: false,
        position: 0,
        duration: 0,
        volume: 1,
        loop: true,
        currentItem: null,
        playlistId: null,
        scheduleId: null,
    };

    private listeners = new Set<PlaybackListener>();

    subscribe(listener: PlaybackListener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private emit(): void {
        this.listeners.forEach((l) => l(this.state));
    }

    private setState(patch: Partial<PlaybackState>): void {
        this.state = { ...this.state, ...patch };
        this.state.currentItem = this.state.items[this.state.currentIndex] ?? null;
        this.emit();
    }

    async loadPlaylist(
        items: PlaylistItem[],
        resolveUri: (mediaUrl: string) => Promise<string>,
        options: LoadPlaylistOptions = {},
    ): Promise<void> {
        const sorted = sortItems(items);
        const playbackItems: PlaybackItem[] = [];

        for (const item of sorted) {
            const mediaType = getMediaTypeForFilter(item);
            try {
                const playbackUri =
                    mediaType === 'image'
                        ? item.mediaUrl
                        : await resolveUri(item.mediaUrl);
                playbackItems.push({
                    ...item,
                    playbackUri,
                    mediaType,
                });
            } catch (err) {
                console.warn(
                    '[Playlist Player] Skipping unplayable item:',
                    item.mediaUrl,
                    err instanceof Error ? err.message : err,
                );
            }
        }

        if (playbackItems.length === 0) {
            throw new Error('No playable items in playlist');
        }

        const startIndex = Math.min(
            Math.max(options.startIndex ?? 0, 0),
            Math.max(playbackItems.length - 1, 0),
        );
        const currentItem = playbackItems[startIndex];
        const startPosition = options.startPosition ?? 0;

        this.setState({
            items: playbackItems,
            currentIndex: startIndex,
            playing:
                options.playing ??
                (playbackItems.length > 0 && options.playing !== false),
            position: startPosition,
            duration: this.deriveDuration(currentItem),
            loop: options.loop ?? this.state.loop,
            playlistId: options.playlistId ?? null,
            scheduleId: options.scheduleId ?? null,
        });
    }

    private deriveDuration(item?: PlaybackItem): number {
        if (!item) return 0;
        if (item.mediaType === 'image') {
            return item.duration && item.duration > 0
                ? item.duration
                : DEFAULT_IMAGE_DURATION_SEC;
        }
        return item.duration ?? 0;
    }

    play(): void {
        if (!this.state.currentItem) return;
        this.setState({ playing: true });
    }

    pause(): void {
        this.setState({ playing: false });
    }

    togglePlayPause(): void {
        if (this.state.playing) this.pause();
        else this.play();
    }

    seek(position: number): void {
        this.setState({ position: Math.max(0, position) });
    }

    setVolume(volume: number): void {
        this.setState({ volume: Math.min(1, Math.max(0, volume)) });
    }

    setPosition(position: number, duration?: number): void {
        this.setState({
            position,
            ...(duration !== undefined ? { duration } : {}),
        });
    }

    onItemEnded(): void {
        const nextIndex = this.state.currentIndex + 1;
        if (nextIndex < this.state.items.length) {
            const nextItem = this.state.items[nextIndex];
            this.setState({
                currentIndex: nextIndex,
                playing: true,
                position: 0,
                duration: this.deriveDuration(nextItem),
            });
            return;
        }

        if (this.state.loop && this.state.items.length > 0) {
            const first = this.state.items[0];
            this.setState({
                currentIndex: 0,
                playing: true,
                position: 0,
                duration: this.deriveDuration(first),
            });
            return;
        }

        this.setState({ playing: false, position: 0 });
    }

    skipNext(): void {
        if (this.state.items.length === 0) return;
        const nextIndex =
            this.state.currentIndex + 1 < this.state.items.length
                ? this.state.currentIndex + 1
                : this.state.loop
                  ? 0
                  : this.state.currentIndex;
        const nextItem = this.state.items[nextIndex];
        this.setState({
            currentIndex: nextIndex,
            playing: true,
            position: 0,
            duration: this.deriveDuration(nextItem),
        });
    }

    skipPrevious(): void {
        if (this.state.items.length === 0) return;
        if (this.state.position > 3) {
            this.setState({ position: 0, playing: true });
            return;
        }
        const prevIndex =
            this.state.currentIndex > 0
                ? this.state.currentIndex - 1
                : this.state.loop
                  ? this.state.items.length - 1
                  : 0;
        const prevItem = this.state.items[prevIndex];
        this.setState({
            currentIndex: prevIndex,
            playing: true,
            position: 0,
            duration: this.deriveDuration(prevItem),
        });
    }

    getState(): PlaybackState {
        return this.state;
    }

    getSessionSnapshot(): {
        mediaUrl: string | null;
        position: number;
        duration: number;
        playing: boolean;
        volume: number;
        playlistId: string | null;
        scheduleId: string | null;
        currentItemIndex: number;
    } {
        const item = this.state.currentItem;
        return {
            mediaUrl: item?.mediaUrl ?? null,
            position: this.state.position,
            duration: this.state.duration,
            playing: this.state.playing,
            volume: this.state.volume,
            playlistId: this.state.playlistId,
            scheduleId: this.state.scheduleId,
            currentItemIndex: this.state.currentIndex,
        };
    }

    isImageItem(item?: PlaybackItem | null): boolean {
        if (!item) return false;
        return item.mediaType === 'image' || isImageUrl(item.mediaUrl);
    }

    isAudioItem(item?: PlaybackItem | null): boolean {
        if (!item) return false;
        return item.mediaType === 'audio';
    }

    isMediaPlayerItem(item?: PlaybackItem | null): boolean {
        if (!item) return false;
        return !this.isImageItem(item);
    }
}

export const playlistPlayer = new PlaylistPlayerEngine();
