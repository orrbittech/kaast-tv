/** Check if URL points to an image (usable as cover art). */
export function isImageUrl(url: string): boolean {
    try {
        const ext = url.split('.').pop()?.toLowerCase() ?? '';
        const path = url.toLowerCase();
        return (
            ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ||
            path.includes('image')
        );
    } catch {
        return false;
    }
}

/** Derive a display title from media URL or optional title. */
export function getDisplayTitle(item: {
    mediaUrl: string;
    title?: string | null;
}): string {
    if (item.title?.trim()) return item.title.trim();
    try {
        const pathname = new URL(item.mediaUrl).pathname;
        const filename = pathname.split('/').pop() ?? item.mediaUrl;
        return decodeURIComponent(filename);
    } catch {
        return item.mediaUrl;
    }
}

/** Format seconds as mm:ss for playback position/duration. */
export function formatDurationShort(seconds?: number): string {
    if (seconds == null || seconds < 0 || Number.isNaN(seconds)) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export type MediaFilterType = 'video' | 'audio' | 'image' | 'media';

export function getMediaTypeForFilter(item: { mediaUrl: string }): MediaFilterType {
    const url = item.mediaUrl.toLowerCase();
    if (isImageUrl(item.mediaUrl)) return 'image';
    if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/.test(url) || url.includes('video')) return 'video';
    if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(url) || url.includes('audio')) return 'audio';
    return 'media';
}

export const DEFAULT_IMAGE_DURATION_SEC = 10;
