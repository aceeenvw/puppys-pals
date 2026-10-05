import { MIN_CUSTOM_FRAMES, MAX_CUSTOM_FRAMES, customFrames } from './pet-core.js';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 384;

export function validateFile(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('fileType');
    if (!file.size || file.size > MAX_FILE_BYTES) throw new Error('fileSize');
}

async function decode(src, signal) {
    signal?.throwIfAborted();
    const image = new Image();
    let timer;
    let abort;
    try {
        const cancelled = new Promise((_, reject) => {
            abort = () => { image.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
            signal?.addEventListener('abort', abort, { once: true });
            timer = setTimeout(() => { image.src = ''; reject(new Error('imageDecode')); }, 10000);
        });
        image.src = src;
        await Promise.race([image.decode(), cancelled]);
        signal?.throwIfAborted();
        if (!image.naturalWidth || !image.naturalHeight
            || image.naturalWidth > MAX_DIMENSION || image.naturalHeight > MAX_DIMENSION) {
            throw new Error('imageDimensions');
        }
        return image;
    } catch (error) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (error.message === 'imageDimensions') throw error;
        throw new Error('imageDecode');
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}

function fitFrame(image) {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const context = canvas.getContext('2d');
    const scale = Math.min(FRAME_WIDTH / image.naturalWidth, FRAME_HEIGHT / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, (FRAME_WIDTH - width) / 2, FRAME_HEIGHT - height, width, height);
    return { src: canvas.toDataURL('image/png') };
}

export async function readFile(file, signal) {
    validateFile(file);
    const url = URL.createObjectURL(file);
    try {
        return fitFrame(await decode(url, signal));
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function collectFrames(frames, signal) {
    if (!Array.isArray(frames) || frames.length < MIN_CUSTOM_FRAMES || frames.length > MAX_CUSTOM_FRAMES
        || Array.from(frames).some(frame => !frame)) throw new Error('allImages');
    signal?.throwIfAborted();
    const result = customFrames({ frames: frames.map(frame => frame.src) });
    if (!result) throw new Error('imagesTooLarge');
    return result;
}

export async function loadDrafts(frames, signal) {
    if (!customFrames({ frames })) throw new Error('imageDecode');
    const drafts = [];
    for (const src of frames) {
        const image = await decode(src, signal);
        // Preserve fitted frames without re-encoding.
        drafts.push(image.naturalWidth === FRAME_WIDTH && image.naturalHeight === FRAME_HEIGHT ? { src } : fitFrame(image));
    }
    return drafts;
}
