import { customFrames, frameSources, normalizeSettings, warn, mobileDevice } from './pet-core.js';
import { createPetRenderer } from './pet-renderer.js';
import { createSettings } from './settings.js';
import { customSound } from './custom-sound.js';
import { createPetLibrary } from './pet-library.js';

const SETTINGS_KEY = 'puppys-pals';
const context = () => globalThis.SillyTavern?.getContext?.();
let session = null;
let pendingWrite = Promise.resolve();

export function init() {
    if (session) return;
    const ctx = context();
    if (!ctx?.extensionSettings || !ctx.eventSource) return;
    const state = { active: true, pet: null, sound: { value: null, loading: !mobileDevice, error: false }, ui: null, renderer: createPetRenderer(), disposers: [], loadVersion: 0, soundVersion: 0 };
    session = state;
    state.library = { pets: [], loading: true, error: false };
    let store;

    function preferences() { return normalizeSettings(context().extensionSettings[SETTINGS_KEY]); }
    function localKey() {
        const settings = context().extensionSettings;
        const raw = settings[SETTINGS_KEY];
        if (typeof raw?.storageId === 'string' && /^[a-f0-9-]{36}$/i.test(raw.storageId)) return raw.storageId;
        const storageId = context().uuidv4();
        settings[SETTINGS_KEY] = { ...normalizeSettings(raw), storageId };
        context().saveSettingsDebounced();
        return storageId;
    }
    function storage() {
        if (!store) {
            const localforage = globalThis.SillyTavern?.libs?.localforage;
            if (!localforage) throw new Error('storageError');
            store = localforage.createInstance({ name: 'puppys-pals', storeName: 'custom_pets' });
        }
        return store;
    }
    function petStorage() { return state.petStorage ||= createPetLibrary(localKey()); }
    function refresh() {
        if (!state.active) return;
        const ctx = context();
        const id = ctx.getCurrentChatId?.();
        const active = id !== undefined && id !== null && id !== '';
        const settings = preferences();
        state.renderer.configure(settings, frameSources(settings.skin, state.pet), active, state.sound.value?.blob);
        state.ui?.refresh();
    }
    function changeSettings(patch) {
        if (!state.active) return;
        const ctx = context();
        const raw = ctx.extensionSettings[SETTINGS_KEY];
        ctx.extensionSettings[SETTINGS_KEY] = { ...normalizeSettings({ ...preferences(), ...patch }), storageId: raw?.storageId };
        ctx.saveSettingsDebounced();
        const settings = preferences();
        if (settings.skin === 'custom' && settings.customPetId && state.pet?.id !== settings.customPetId) {
            void loadActivePet().catch(error => { if (state.active) warn('load custom pet', error); });
        } else if (settings.skin !== 'custom') {
            ++state.loadVersion;
            state.pet = null;
        }
        refresh();
    }
    async function loadActivePet() {
        const version = ++state.loadVersion;
        const id = preferences().customPetId;
        state.pet = null;
        refresh();
        if (!id) return;
        await pendingWrite;
        if (!state.active || version !== state.loadVersion) return;
        const pet = await petStorage().load(id);
        if (state.active && version === state.loadVersion) {
            state.pet = pet;
            refresh();
        }
    }
    async function loadLibrary() {
        state.library.loading = true;
        try {
            await pendingWrite;
            if (!state.active) return [];
            const key = localKey();
            const legacy = await storage().getItem(key);
            if (!state.active) return [];
            const pets = await petStorage().migrate(legacy);
            if (legacy) await storage().removeItem(key);
            if (!state.active) return [];
            state.library = { pets, loading: false, error: false };
            const settings = preferences();
            if (!settings.customPetId && pets.length) changeSettings({ customPetId: pets[0].id });
            else if (settings.customPetId && !pets.some(pet => pet.id === settings.customPetId)) {
                changeSettings({ customPetId: '', ...(settings.skin === 'custom' ? { skin: 'classic' } : {}) });
            } else if (settings.skin === 'custom') await loadActivePet();
            refresh();
            return pets;
        } catch (error) {
            if (state.active) { state.library.loading = false; state.library.error = true; refresh(); }
            throw error;
        }
    }
    async function writePet(pet, id) {
        if (!state.active) return;
        const db = petStorage();
        const record = pet ? { ...pet, id: id || context().uuidv4() } : null;
        ++state.loadVersion;
        const write = pendingWrite.then(() => record ? db.save(record) : db.remove(id));
        pendingWrite = write.catch(() => {});
        const pets = await write;
        if (!state.active) return;
        state.library = { pets, loading: false, error: false };
        if (record) {
            state.pet = record;
            changeSettings({ skin: 'custom', customPetId: record.id });
        } else if (preferences().customPetId === id) {
            state.pet = null;
            changeSettings({ customPetId: '', ...(preferences().skin === 'custom' ? { skin: 'classic' } : {}) });
        }
        else refresh();
        return record;
    }
    async function loadSound() {
        const version = ++state.soundVersion;
        try {
            const key = `${localKey()}:sound`;
            await pendingWrite;
            if (!state.active) return;
            const raw = await storage().getItem(key);
            const value = customSound(raw);
            if (raw && !value) throw new Error('soundDecode');
            if (state.active && version === state.soundVersion) state.sound = { value, loading: false, error: false };
        } catch (error) {
            if (state.active && version === state.soundVersion) {
                state.sound = { value: null, loading: false, error: true };
                warn('load custom sound', error);
            }
        } finally {
            if (state.active && version === state.soundVersion) refresh();
        }
    }
    async function writeSound(value, select = true) {
        if (!state.active || mobileDevice) return;
        const sound = value === null ? null : customSound(value);
        if (value !== null && !sound) throw new Error('soundDecode');
        const key = `${localKey()}:sound`;
        const db = storage();
        ++state.soundVersion;
        const write = pendingWrite.then(() => sound ? db.setItem(key, sound) : db.removeItem(key));
        pendingWrite = write.catch(() => {});
        await write;
        if (!state.active) return;
        state.sound = { value: sound, loading: false, error: false };
        if (sound && select) changeSettings({ soundPreset: 'custom' });
        else if (!sound && preferences().soundPreset === 'custom') changeSettings({ soundPreset: 'typewriter' });
        else refresh();
    }
    function mount() {
        if (!state.active) return;
        if (!state.ui?.root.isConnected) {
            const container = document.getElementById('extensions_settings');
            if (container) {
                state.ui?.destroy();
                state.ui = createSettings({
                    getSettings: preferences, getPet: () => state.pet, changeSettings,
                    getLibrary: () => state.library, loadLibrary,
                    loadPet: id => petStorage().load(id),
                    savePet: async (pet, id) => {
                        const frames = customFrames(pet);
                        if (!frames) throw new Error('imagesTooLarge');
                        return writePet({ frames, name: pet.name }, id);
                    },
                    removePet: id => writePet(null, id),
                    getSound: () => state.sound, saveSound: writeSound, removeSound: () => writeSound(null),
                });
                container.append(state.ui.root);
            }
        }
        refresh();
    }
    function subscribe(name, callback) {
        const type = (ctx.eventTypes || ctx.event_types)[name];
        if (!type) return;
        ctx.eventSource.on(type, callback);
        state.disposers.push(() => ctx.eventSource.removeListener(type, callback));
    }
    subscribe('APP_READY', mount);
    subscribe('CHAT_CHANGED', mount);
    for (const name of ['SETTINGS_UPDATED', 'GENERATION_STARTED', 'GENERATION_STOPPED', 'GENERATION_ENDED']) subscribe(name, refresh);
    mount();
    void loadLibrary().catch(error => { if (state.active) warn('load pet library', error); });
    if (!mobileDevice) void loadSound();
}

export function cleanup() {
    if (!session) return;
    const state = session;
    session = null;
    state.active = false;
    for (const dispose of state.disposers) dispose();
    state.ui?.destroy();
    state.renderer.stop();
    state.petStorage?.close();
    state.library.pets = [];
    state.pet = state.ui = null;
    state.sound.value = null;
}

init();
