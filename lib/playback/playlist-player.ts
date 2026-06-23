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
}

export type PlaybackListener = (state: PlaybackState) => void;

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
    ): Promise<void> {
        const sorted = sortItems(items);
        const playbackItems: PlaybackItem[] = await Promise.all(
            sorted.map(async (item) => {
                const playbackUri = await resolveUri(item.mediaUrl);
                return {
                    ...item,
                    playbackUri,
                    mediaType: getMediaTypeForFilter(item),
                };
            }),
        );

        this.setState({
            items: playbackItems,
            currentIndex: 0,
            playing: playbackItems.length > 0,
            position: 0,
            duration: this.deriveDuration(playbackItems[0]),
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
    } {
        const item = this.state.currentItem;
        return {
            mediaUrl: item?.mediaUrl ?? null,
            position: this.state.position,
            duration: this.state.duration,
            playing: this.state.playing,
            volume: this.state.volume,
        };
    }

    isImageItem(item?: PlaybackItem | null): boolean {
        if (!item) return false;
        return item.mediaType === 'image' || isImageUrl(item.mediaUrl);
    }
}

export const playlistPlayer = new PlaylistPlayerEngine();
