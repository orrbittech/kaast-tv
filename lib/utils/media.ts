/** Check if URL points to an image (usable as cover art or slideshow item). */
export function isImageUrl(url: string): boolean {
    try {
        const pathname = new URL(url).pathname.toLowerCase();
        const ext = pathname.split('.').pop() ?? '';
        return (
            ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ||
            pathname.includes('/photos/') ||
            url.toLowerCase().includes('image')
        );
    } catch {
        const path = url.toLowerCase();
        const ext = path.split('.').pop()?.split('?')[0] ?? '';
        return (
            ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ||
            path.includes('image')
        );
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

const PLAYABLE_CONTENT_TYPE =
    /^(video\/|audio\/|image\/|application\/(octet-stream|vnd\.apple\.mpegurl|dash\+xml))/i;
const NON_PLAYABLE_CONTENT_TYPE = /^text\//i;
const PLAYABLE_EXTENSION =
    /\.(mp4|webm|mov|m4v|mkv|m3u8|mp3|wav|ogg|m4a|aac|jpe?g|png|gif|webp)(\?|$)/i;

export interface MediaUrlValidation {
    ok: boolean;
    error?: string;
}

/** Probe a remote URL before handing it to the player or image carousel. */
export async function validateMediaUrl(mediaUrl: string): Promise<MediaUrlValidation> {
    if (isImageUrl(mediaUrl)) {
        return validateImageUrl(mediaUrl);
    }

    return validateStreamMediaUrl(mediaUrl);
}

async function validateImageUrl(mediaUrl: string): Promise<MediaUrlValidation> {
    try {
        const response = await fetch(mediaUrl, { method: 'HEAD', redirect: 'follow' });
        if (!response.ok) {
            return { ok: false, error: `HTTP ${response.status}` };
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (NON_PLAYABLE_CONTENT_TYPE.test(contentType)) {
            return { ok: false, error: `URL returned HTML instead of an image (${contentType})` };
        }

        const isImageType = /^image\//i.test(contentType);
        if (contentType && !isImageType && !isImageUrl(mediaUrl)) {
            return { ok: false, error: `Unsupported content type: ${contentType}` };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Network error',
        };
    }
}

async function validateStreamMediaUrl(mediaUrl: string): Promise<MediaUrlValidation> {
    try {
        let response = await fetch(mediaUrl, { method: 'HEAD', redirect: 'follow' });

        if (!response.ok && (response.status === 403 || response.status === 405)) {
            response = await fetch(mediaUrl, {
                method: 'GET',
                headers: { Range: 'bytes=0-0' },
                redirect: 'follow',
            });
        }

        if (!response.ok) {
            return { ok: false, error: `HTTP ${response.status}` };
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (NON_PLAYABLE_CONTENT_TYPE.test(contentType)) {
            return { ok: false, error: `URL returned HTML instead of media (${contentType})` };
        }

        const hasPlayableType = PLAYABLE_CONTENT_TYPE.test(contentType);
        const hasPlayableExtension = PLAYABLE_EXTENSION.test(mediaUrl);
        if (contentType && !hasPlayableType && !hasPlayableExtension) {
            return { ok: false, error: `Unsupported content type: ${contentType}` };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Network error',
        };
    }
}
