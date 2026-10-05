export const skins = Object.freeze([
    { id: 'classic', label: 'Samoyed', prefix: 'puppy' },
    { id: 'blackcat', label: 'Black Cat', prefix: 'blackcat' },
    { id: 'poodle', label: 'Brown Poodle', prefix: 'poodle' },
    { id: 'redfox', label: 'Red Fox', prefix: 'redfox' },
    { id: 'whitefox', label: 'White Fox', prefix: 'whitefox' },
    { id: 'kitsune', label: 'Kitsune Fox', prefix: 'kitsune' },
    { id: 'hamster', label: 'Hamster', prefix: 'hamster' },
    { id: 'redpanda', label: 'Red Panda', prefix: 'redpanda' },
    { id: 'tiger', label: 'Orange Tiger', prefix: 'tiger' },
    { id: 'snake', label: 'Reticulated Python', prefix: 'python' },
    { id: 'shark', label: 'Blue Shark', prefix: 'shark' },
    { id: 'custom', label: 'Custom Pet', prefix: null },
].map(Object.freeze));

export const typingSounds = Object.freeze([
    { id: 'typewriter', label: 'soundTypewriter' },
    { id: 'keyboard', label: 'soundKeyboard' },
    { id: 'iphone', label: 'soundIphone' },
    { id: 'custom', label: 'soundCustom' },
].map(Object.freeze));

export const defaults = Object.freeze({ enabled: true, typingSound: false, soundPreset: 'typewriter', skin: 'classic', size: 100, gap: 4 });
export const MIN_CUSTOM_FRAMES = 3;
export const MAX_CUSTOM_FRAMES = 9;
export const warn = (scope, error) => console.warn(`[PP] ${scope}`, error);

export function customFrames(value) {
    const frames = value?.frames;
    return Array.isArray(frames) && frames.length >= MIN_CUSTOM_FRAMES && frames.length <= MAX_CUSTOM_FRAMES
        && Array.from(frames).every(frame => typeof frame === 'string' && frame.length <= 3000000
            && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame))
        && frames.reduce((total, frame) => total + frame.length, 0) <= 9000000
        ? frames.slice() : null;
}

export function frameSources(id, customPet) {
    if (id === 'custom') {
        const custom = customFrames(customPet);
        if (custom) return custom;
    }
    const skin = skins.find(skin => skin.id === id && skin.prefix) || skins[0];
    return ['idle', 'left', 'right'].map(pose => new URL(`assets/${skin.prefix}-${pose}.png`, import.meta.url).href);
}

export function normalizeSettings(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const clamp = (n, fallback, min, max) => Number.isFinite(Number(n))
        ? Math.min(max, Math.max(min, Number(n))) : fallback;
    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        typingSound: typeof value.typingSound === 'boolean' ? value.typingSound : defaults.typingSound,
        soundPreset: typingSounds.some(sound => sound.id === value.soundPreset) ? value.soundPreset : defaults.soundPreset,
        skin: skins.some(skin => skin.id === value.skin) ? value.skin : defaults.skin,
        customPetId: typeof value.customPetId === 'string' && /^(legacy|[a-f0-9-]{36})$/i.test(value.customPetId) ? value.customPetId : '',
        size: clamp(value.size ?? defaults.size, defaults.size, 32, 300),
        gap: clamp(value.gap ?? defaults.gap, defaults.gap, -24, 160),
    };
}

export function railPosition(caret, size, gap, viewportWidth, railRect = caret.rect) {
    const viewportMax = Math.max(0, viewportWidth - size);
    const minLeft = Math.max(0, Math.min(viewportMax, railRect.left));
    const maxLeft = Math.max(minLeft, Math.min(viewportMax, railRect.right - size));
    return {
        left: Math.max(minLeft, Math.min(maxLeft, caret.x - size / 2)),
        top: Math.max(0, railRect.top - size * 0.75 - gap),
    };
}
