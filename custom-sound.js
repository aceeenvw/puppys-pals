const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'application/ogg', 'audio/mp4', 'audio/x-m4a']);
const EXTENSIONS = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' };

export const soundName = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 64) : '';

export function customSound(value) {
    return value?.blob instanceof Blob && value.blob.size > 0 && value.blob.size <= MAX_BYTES
        && TYPES.has(value.blob.type) && Number.isFinite(value.duration) && value.duration > 0 && value.duration <= 5
        ? { blob: value.blob, name: soundName(value.name), duration: value.duration } : null;
}

export async function readSound(file, name, signal) {
    signal?.throwIfAborted();
    if (!(file instanceof Blob) || !file.size || file.size > MAX_BYTES) throw new Error('soundFileSize');
    const extension = file.name?.split('.').at(-1)?.toLowerCase();
    const type = (!file.type || file.type === 'application/octet-stream') ? EXTENSIONS[extension] : file.type;
    if (!TYPES.has(type)) throw new Error('soundFileType');
    const blob = file.slice(0, file.size, type);
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    try {
        const duration = await new Promise((resolve, reject) => {
            const finish = error => {
                clearTimeout(timer);
                audio.removeEventListener('loadedmetadata', loaded);
                audio.removeEventListener('error', failed);
                signal?.removeEventListener('abort', aborted);
                if (error) reject(error);
                else resolve(audio.duration);
            };
            const loaded = () => finish(!Number.isFinite(audio.duration) || audio.duration <= 0 || audio.duration > 5 ? new Error('soundDuration') : null);
            const failed = () => finish(new Error('soundDecode'));
            const aborted = () => finish(signal.reason || new DOMException('Aborted', 'AbortError'));
            const timer = setTimeout(failed, 10000);
            audio.addEventListener('loadedmetadata', loaded);
            audio.addEventListener('error', failed);
            signal?.addEventListener('abort', aborted, { once: true });
            audio.preload = 'metadata';
            audio.src = url;
        });
        signal?.throwIfAborted();
        return { blob, duration, name: soundName(name) || soundName(file.name?.replace(/\.[^.]+$/, '')) };
    } finally {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        URL.revokeObjectURL(url);
    }
}
