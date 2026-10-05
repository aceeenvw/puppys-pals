import { defaults, typingSounds, warn, mobileDevice } from './pet-core.js';

export function createTypingSound() {
    let preset = defaults.soundPreset;
    let audio;
    let customBlob = null;
    let objectUrl = null;
    let version = 0;
    let priming = false;
    let unlocked = false;
    let warned = false;

    function play(quiet = false) {
        if (mobileDevice) return;
        if (quiet && (unlocked || priming)) return;
        if (!audio) {
            if (customBlob) objectUrl = URL.createObjectURL(customBlob);
            audio = new Audio(objectUrl || new URL(`./assets/sounds/${preset}.mp3`, import.meta.url).href);
        }
        const player = audio;
        player.preload = 'auto';
        const current = ++version;
        priming = quiet;
        const failed = error => {
            if (current !== version) return;
            priming = false;
            unlocked = false;
            player.muted = false;
            if (!['NotAllowedError', 'AbortError'].includes(error.name) && !warned) {
                warned = true;
                warn('typing sound', error);
            }
        };
        try {
            player.muted = quiet;
            if (player.readyState > 0) player.currentTime = 0;
            Promise.resolve(player.play()).then(() => {
                if (current !== version) return;
                priming = false;
                unlocked = true;
                if (quiet) {
                    player.pause();
                    player.currentTime = 0;
                    player.muted = false;
                }
            }).catch(failed);
        } catch (error) {
            failed(error);
        }
    }

    function pause() {
        ++version;
        priming = false;
        if (!audio) return;
        audio.pause();
        audio.muted = false;
        if (audio.readyState > 0) audio.currentTime = 0;
    }

    function stop() {
        pause();
        if (audio) {
            audio.removeAttribute('src');
            audio.load();
            audio = null;
        }
        unlocked = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
    }

    function setPreset(value, blob = null) {
        const next = typingSounds.some(sound => sound.id === value) && (value !== 'custom' || blob) ? value : defaults.soundPreset;
        const nextBlob = next === 'custom' ? blob : null;
        if (next === preset && nextBlob === customBlob) return;
        stop();
        preset = next;
        customBlob = nextBlob;
        warned = false;
    }

    return { play: () => play(), prime: () => play(true), pause, stop, setPreset };
}
