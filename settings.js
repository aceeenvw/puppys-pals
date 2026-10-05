import { skins, typingSounds, frameSources, customFrames, MIN_CUSTOM_FRAMES, MAX_CUSTOM_FRAMES, mobileDevice } from './pet-core.js';
import { readFile, collectFrames, loadDrafts } from './custom-images.js';
import { readSound, soundName } from './custom-sound.js';
import { MAX_PETS, petName } from './pet-library.js';
import { translate as t, translateElement } from './i18n.js';

export function createSettings({ getSettings, getPet, changeSettings, savePet, removePet, loadPet, getLibrary, loadLibrary, getSound, saveSound, removeSound }) {
    const listeners = new AbortController();
    const root = document.createElement('div');
    root.id = 'puppys-pals-settings';
    let closeManager = null;
    let soundBusy = false, soundDirty = false, soundMessage = '', soundError = false;
    let petOptionsKey = '';
    root.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>⊹ PUPPY'S PALS ⊹</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down up"></div>
            </div>
            <div id="pp-settings-content" class="inline-drawer-content" style="display: none;">
                <div class="pp-ui pp-settings">
                    <p class="pp-intro" data-pp-i18n="intro"></p>
                    <label class="pp-block pp-block--toggle" for="pp-enabled">
                        <span class="pp-text"><span class="pp-label" data-pp-i18n="enabled"></span><span class="pp-desc" data-pp-i18n="enabledDesc"></span></span>
                        <input id="pp-enabled" type="checkbox">
                    </label>
                    <details class="pp-card" id="pp-sound-section">
                        <summary><i class="fa-solid fa-music" aria-hidden="true"></i><span data-pp-i18n="soundCategory"></span></summary>
                        <div class="pp-fields">
                            <label class="pp-block pp-block--toggle" for="pp-typing-sound">
                                <span class="pp-text"><span class="pp-label" data-pp-i18n="typingSound"></span><span class="pp-desc" data-pp-i18n="typingSoundDesc"></span></span>
                                <input id="pp-typing-sound" type="checkbox">
                            </label>
                            <div class="pp-field" id="pp-sound-options" hidden>
                                <label class="pp-label" for="pp-sound-preset" data-pp-i18n="soundPreset"></label>
                                <select id="pp-sound-preset" class="text_pole"></select>
                                <div class="pp-block" id="pp-custom-sound">
                                    <h4 class="pp-heading" data-pp-i18n="soundCustom"></h4>
                                    <p class="pp-desc" id="pp-sound-hint" data-pp-i18n="soundHint"></p>
                                    <label class="pp-label" for="pp-sound-name" data-pp-i18n="soundName"></label>
                                    <input id="pp-sound-name" class="text_pole pp-text-input" type="text" maxlength="64" autocomplete="off" aria-describedby="pp-sound-hint">
                                    <div class="pp-buttons">
                                        <button class="menu_button pp-button" id="pp-sound-upload" type="button"><i class="fa-solid fa-upload" aria-hidden="true"></i><span data-pp-i18n="soundUpload"></span></button>
                                        <button class="menu_button pp-button" id="pp-sound-rename" type="button"><i class="fa-solid fa-check" aria-hidden="true"></i><span data-pp-i18n="soundRename"></span></button>
                                        <button class="menu_button pp-button" id="pp-sound-remove" type="button"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span data-pp-i18n="soundRemove"></span></button>
                                    </div>
                                    <input id="pp-sound-file" type="file" accept=".mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/mp4" hidden>
                                    <p class="pp-desc" data-pp-i18n="soundLocal"></p>
                                    <p class="pp-desc" id="pp-sound-status" role="status" aria-live="polite" aria-atomic="true"></p>
                                </div>
                            </div>
                        </div>
                    </details>
                    <details class="pp-card" open>
                        <summary><i class="fa-solid fa-paw" aria-hidden="true"></i><span id="pp-appearance-title" data-pp-i18n="appearance"></span></summary>
                        <div class="pp-fields">
                            <div class="pp-preview"><img alt="" draggable="false"><span class="pp-heading" data-pp-i18n="preview"></span></div>
                            <select id="pp-skin" class="text_pole" aria-labelledby="pp-appearance-title"></select>
                            <p class="pp-desc pp-missing" data-pp-i18n="customMissing" hidden></p>
                            <div class="pp-buttons">
                                <button class="menu_button pp-button" id="pp-manage" type="button"><i class="fa-solid fa-paw" aria-hidden="true"></i><span data-pp-i18n="manage"></span></button>
                            </div>
                        </div>
                    </details>
                    <details class="pp-card" open>
                        <summary><i class="fa-solid fa-sliders" aria-hidden="true"></i><span data-pp-i18n="position"></span></summary>
                        <div class="pp-fields">
                            <div class="pp-field">
                                <label class="pp-label" for="pp-size" data-pp-i18n="size"></label>
                                <div class="pp-stepper" data-pp-control="size">
                                    <button class="menu_button pp-button" type="button" data-pp-step="-1"><i class="fa-solid fa-minus" aria-hidden="true"></i><span class="pp-sr-only" data-pp-i18n="smaller"></span></button>
                                    <div class="pp-number"><input id="pp-size" class="text_pole" type="number" inputmode="numeric" min="32" max="300" step="4"><span aria-hidden="true">px</span></div>
                                    <button class="menu_button pp-button" type="button" data-pp-step="1"><i class="fa-solid fa-plus" aria-hidden="true"></i><span class="pp-sr-only" data-pp-i18n="larger"></span></button>
                                </div>
                            </div>
                            <div class="pp-field">
                                <label class="pp-label" for="pp-gap" data-pp-i18n="gap"></label>
                                <div class="pp-stepper" data-pp-control="gap">
                                    <button class="menu_button pp-button" type="button" data-pp-step="-1"><i class="fa-solid fa-minus" aria-hidden="true"></i><span class="pp-sr-only" data-pp-i18n="lower"></span></button>
                                    <div class="pp-number"><input id="pp-gap" class="text_pole" type="number" min="-24" max="160" step="1"><span aria-hidden="true">px</span></div>
                                    <button class="menu_button pp-button" type="button" data-pp-step="1"><i class="fa-solid fa-plus" aria-hidden="true"></i><span class="pp-sr-only" data-pp-i18n="higher"></span></button>
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>`;
    const select = root.querySelector('#pp-skin');
    for (const skin of skins) {
        const option = new Option(t(skin.id), skin.id);
        option.dataset.ppI18n = skin.id;
        select.append(option);
    }
    const on = (target, name, handler) => target.addEventListener(name, handler, { signal: listeners.signal });
    const soundSelect = root.querySelector('#pp-sound-preset');
    for (const sound of typingSounds) {
        const option = new Option(t(sound.label), sound.id);
        option.dataset.ppI18n = sound.label;
        soundSelect.append(option);
    }
    const soundInput = root.querySelector('#pp-sound-file');
    const nameInput = root.querySelector('#pp-sound-name');
    const rename = root.querySelector('#pp-sound-rename');
    on(nameInput, 'input', () => {
        soundDirty = true;
        rename.hidden = !getSound().value;
        rename.disabled = !getSound().value || soundBusy;
    });
    on(nameInput, 'keydown', event => {
        event.stopPropagation();
        if (event.key === 'Enter') { event.preventDefault(); rename.click(); }
    });
    on(root.querySelector('#pp-sound-upload'), 'click', () => soundInput.click());
    on(soundInput, 'change', () => {
        const file = soundInput.files?.[0];
        if (!file) return;
        void soundTask(async () => {
            const value = await readSound(file, soundDirty ? nameInput.value : '', listeners.signal);
            listeners.signal.throwIfAborted();
            await saveSound(value);
        }, 'soundSaved');
    });
    on(rename, 'click', () => {
        const value = getSound().value;
        if (value) void soundTask(() => saveSound({ ...value, name: soundName(nameInput.value) }, false), 'soundRenamed');
    });
    on(root.querySelector('#pp-sound-remove'), 'click', () => { void soundTask(removeSound, 'soundRemoved'); });

    async function soundTask(operation, success) {
        if (mobileDevice || soundBusy || getSound().loading) return;
        soundBusy = true;
        soundMessage = 'working';
        soundError = false;
        refresh();
        try {
            await operation();
            if (listeners.signal.aborted) return;
            soundDirty = false;
            soundMessage = success;
        } catch (error) {
            soundMessage = ['soundFileSize', 'soundFileType', 'soundDuration', 'soundDecode'].includes(error.message) ? error.message : 'soundStorageError';
            soundError = true;
        } finally {
            soundInput.value = '';
            if (!listeners.signal.aborted) { soundBusy = false; refresh(); }
        }
    }
    on(soundSelect, 'change', () => { if (!mobileDevice) changeSettings({ soundPreset: soundSelect.value }); });
    on(root.querySelector('#pp-enabled'), 'change', event => changeSettings({ enabled: event.target.checked }));
    on(root.querySelector('#pp-typing-sound'), 'change', event => { if (!mobileDevice) changeSettings({ typingSound: event.target.checked }); });
    on(select, 'change', () => changeSettings(select.value.startsWith('pet:')
        ? { skin: 'custom', customPetId: select.value.slice(4) } : { skin: select.value }));
    for (const key of ['size', 'gap']) {
        const input = root.querySelector(`#pp-${key}`);
        const commit = (direction = 0) => {
            const min = Number(input.min), max = Number(input.max), step = Number(input.step);
            const current = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : getSettings()[key];
            const snapped = min + Math.round((current - min) / step) * step;
            changeSettings({ [key]: Math.max(min, Math.min(max, snapped + direction * step)) });
            refresh();
        };
        on(input, 'change', () => commit());
        on(input, 'keydown', event => {
            event.stopPropagation();
            if (event.key === 'Enter') { event.preventDefault(); commit(); }
        });
        for (const button of root.querySelectorAll(`[data-pp-control="${key}"] [data-pp-step]`)) {
            on(button, 'click', () => commit(Number(button.dataset.ppStep)));
        }
    }
    on(root.querySelector('.inline-drawer-header'), 'click', refresh);
    on(root.querySelector('#pp-manage'), 'click', openManager);

    function refresh() {
        if (listeners.signal.aborted) return;
        const settings = getSettings();
        translateElement(root);
        root.querySelector('#pp-enabled').checked = settings.enabled;
        root.querySelector('#pp-sound-section').hidden = mobileDevice;
        root.querySelector('#pp-typing-sound').disabled = soundSelect.disabled = mobileDevice;
        root.querySelector('#pp-typing-sound').checked = !mobileDevice && settings.typingSound;
        root.querySelector('#pp-sound-options').hidden = !settings.typingSound;
        soundSelect.value = settings.soundPreset;
        const sound = getSound();
        const customOption = soundSelect.querySelector('option[value="custom"]');
        customOption.textContent = sound.value?.name ? `${t('soundCustom')} · ${sound.value.name}` : t('soundCustom');
        if (!soundDirty) nameInput.value = sound.value?.name || '';
        const soundDisabled = mobileDevice || soundBusy || sound.loading;
        root.querySelector('#pp-custom-sound').setAttribute('aria-busy', String(soundDisabled));
        nameInput.disabled = soundInput.disabled = root.querySelector('#pp-sound-upload').disabled = soundDisabled;
        rename.disabled = soundDisabled || !sound.value || !soundDirty;
        rename.hidden = !sound.value || !soundDirty;
        root.querySelector('#pp-sound-remove').disabled = soundDisabled || (!sound.value && !sound.error);
        root.querySelector('#pp-sound-remove').hidden = !sound.value && !sound.error;
        const soundStatus = root.querySelector('#pp-sound-status');
        const statusKey = soundMessage || (sound.loading ? 'soundLoading' : sound.error ? 'soundStorageError' : !sound.value ? 'soundMissing' : '');
        soundStatus.textContent = statusKey ? t(statusKey) : '';
        soundStatus.classList.toggle('pp-error', soundError || sound.error);
        const library = getLibrary();
        const optionsKey = JSON.stringify(library.pets.map(pet => [pet.id, pet.name || t('custom')]));
        if (optionsKey !== petOptionsKey) {
            select.querySelectorAll('[data-pp-pet]').forEach(option => option.remove());
            for (const pet of library.pets) {
                const option = new Option(pet.name || t('custom'), `pet:${pet.id}`);
                option.dataset.ppPet = pet.id;
                select.append(option);
            }
            petOptionsKey = optionsKey;
        }
        select.querySelector('option[value="custom"]').hidden = library.pets.length > 0;
        select.value = settings.skin === 'custom' && library.pets.some(pet => pet.id === settings.customPetId)
            ? `pet:${settings.customPetId}` : settings.skin;
        for (const key of ['size', 'gap']) {
            const input = root.querySelector(`#pp-${key}`);
            input.value = settings[key];
            for (const button of root.querySelectorAll(`[data-pp-control="${key}"] [data-pp-step]`)) {
                button.disabled = Number(button.dataset.ppStep) < 0
                    ? settings[key] <= Number(input.min) : settings[key] >= Number(input.max);
            }
        }
        const preview = root.querySelector('.pp-preview img');
        const src = frameSources(settings.skin, getPet())[0];
        if (preview.src !== src) preview.src = src;
        preview.style.width = `${settings.size}px`;
        root.querySelector('.pp-missing').hidden = settings.skin !== 'custom' || Boolean(customFrames(getPet()));
    }

    function openManager() {
        if (closeManager) return;
        const controller = new AbortController();
        const signal = controller.signal;
        const dialog = document.createElement('dialog');
        dialog.id = 'pp-manager';
        dialog.className = 'pp-ui';
        dialog.setAttribute('aria-labelledby', 'pp-manager-title');
        dialog.setAttribute('aria-describedby', 'pp-local-notice');
        dialog.innerHTML = `
            <div class="pp-manager-head">
                <h3 id="pp-manager-title" data-pp-i18n="manage"></h3>
                <button class="menu_button pp-button" type="button" data-pp-close autofocus><i class="fa-solid fa-xmark" aria-hidden="true"></i><span data-pp-i18n="close"></span></button>
            </div>
            <p id="pp-local-notice" class="pp-intro" data-pp-i18n="localNotice"></p>
            <div class="pp-block">
                <label class="pp-label" for="pp-pet-choice" data-pp-i18n="savedPets"></label>
                <select id="pp-pet-choice" class="text_pole"></select>
                <div class="pp-buttons"><button class="menu_button pp-button" type="button" data-pp-new><i class="fa-solid fa-plus" aria-hidden="true"></i><span data-pp-i18n="newPet"></span></button></div>
                <p class="pp-desc" data-pp-pet-count></p>
                <label class="pp-label" for="pp-pet-name" data-pp-i18n="petName"></label>
                <input id="pp-pet-name" class="text_pole pp-text-input" type="text" maxlength="64" autocomplete="off">
            </div>
            <p class="pp-desc" data-pp-i18n="importHint"></p>
            <p class="pp-desc" data-pp-i18n="frameHint"></p>
            <div class="pp-poses"></div>
            <div class="pp-frame-tools">
                <span class="pp-desc" data-pp-count></span>
                <button class="menu_button pp-button" type="button" data-pp-add><i class="fa-solid fa-plus" aria-hidden="true"></i><span data-pp-i18n="addFrame"></span></button>
            </div>
            <p class="pp-status" role="status" aria-live="polite" aria-atomic="true"></p>
            <div class="pp-buttons">
                <button class="menu_button pp-button" type="button" data-pp-save><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i><span data-pp-i18n="save"></span></button>
                <button class="menu_button pp-button" type="button" data-pp-remove><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span data-pp-i18n="remove"></span></button>
            </div>`;
        const poses = dialog.querySelector('.pp-poses');
        const status = dialog.querySelector('.pp-status');
        const save = dialog.querySelector('[data-pp-save]');
        const remove = dialog.querySelector('[data-pp-remove]');
        const add = dialog.querySelector('[data-pp-add]');
        const choice = dialog.querySelector('#pp-pet-choice');
        const name = dialog.querySelector('#pp-pet-name');
        const newPet = dialog.querySelector('[data-pp-new]');
        let drafts = Array(MIN_CUSTOM_FRAMES).fill(null);
        let busy = true;
        let editingId = '';
        let choicesKey = '';
        let fields = [];

        async function editPet(id) {
            busy = true;
            editingId = id;
            drafts = Array(MIN_CUSTOM_FRAMES).fill(null);
            name.value = id ? getLibrary().pets.find(pet => pet.id === id)?.name || t('custom') : '';
            message(id ? 'loading' : '');
            render();
            try {
                if (id) {
                    const pet = await loadPet(id);
                    signal.throwIfAborted();
                    drafts = await loadDrafts(pet.frames, signal);
                    signal.throwIfAborted();
                }
                message('');
            } catch (error) {
                if (!signal.aborted) message(['imageDecode', 'imageDimensions', 'petMissing'].includes(error.message) ? error.message : 'storageError', true);
            } finally {
                if (!signal.aborted) { busy = false; render(); }
            }
        }
        choice.addEventListener('change', () => { if (!busy) void editPet(choice.value); }, { signal });
        newPet.addEventListener('click', () => {
            if (busy || getLibrary().pets.length >= MAX_PETS) return;
            void editPet('');
            name.focus();
        }, { signal });
        name.addEventListener('input', updateSave, { signal });

        function createField(index) {
            const card = document.createElement('div');
            card.className = 'pp-block pp-pose';
            card.dataset.ppIndex = index;
            card.innerHTML = `
                <h4 id="pp-pose-${index}" class="pp-heading"></h4>
                <div class="pp-image"><img alt="" hidden><span data-pp-i18n="empty"></span></div>
                <button class="menu_button pp-button" type="button" data-pp-pick aria-labelledby="pp-pose-${index} pp-file-label-${index}"><i class="fa-solid fa-upload" aria-hidden="true"></i><span id="pp-file-label-${index}" data-pp-i18n="choose"></span></button>
                <button class="menu_button pp-button" type="button" data-pp-drop aria-labelledby="pp-drop-label-${index} pp-pose-${index}" ${index < MIN_CUSTOM_FRAMES ? 'hidden' : ''}><i class="fa-solid fa-minus" aria-hidden="true"></i><span id="pp-drop-label-${index}" data-pp-i18n="removeFrame"></span></button>
                <input id="pp-file-${index}" type="file" accept="image/png,image/jpeg,image/webp" aria-labelledby="pp-pose-${index} pp-file-label-${index}" hidden>`;
            card.querySelector('h4').textContent = `${t('frame')} ${index + 1} · ${t(index === 0 ? 'idle' : 'typing')}`;
            translateElement(card);
            poses.append(card);
            return {
                input: card.querySelector('input'), pick: card.querySelector('[data-pp-pick]'),
                drop: card.querySelector('[data-pp-drop]'), image: card.querySelector('img'), empty: card.querySelector('.pp-image span'),
            };
        }

        poses.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button || busy) return;
            const index = Number(button.closest('[data-pp-index]').dataset.ppIndex);
            if (button.hasAttribute('data-pp-pick')) fields[index].input.click();
            else if (button.hasAttribute('data-pp-drop') && index >= MIN_CUSTOM_FRAMES) {
                drafts.splice(index, 1);
                message('');
                render();
                fields[Math.min(index, fields.length - 1)].pick.focus();
            }
        }, { signal });
        poses.addEventListener('change', async event => {
            const input = event.target;
            if (!input.matches('input[type="file"]')) return;
            const file = input.files?.[0];
            if (!file || busy) return;
            const index = Number(input.closest('[data-pp-index]').dataset.ppIndex);
            busy = true;
            message('loading');
            render();
            try {
                const draft = await readFile(file, signal);
                if (signal.aborted) return;
                drafts[index] = draft;
                message('');
            } catch (error) {
                if (!signal.aborted) message(['fileType', 'fileSize', 'imageDimensions'].includes(error.message) ? error.message : 'imageDecode', true);
            } finally {
                if (!signal.aborted) { input.value = ''; busy = false; render(); }
            }
        }, { signal });
        add.addEventListener('click', () => {
            if (busy || drafts.length >= MAX_CUSTOM_FRAMES) return;
            drafts.push(null);
            message('');
            render();
            fields.at(-1).pick.focus();
        }, { signal });

        function message(key, error = false) {
            status.textContent = key ? t(key) : '';
            status.classList.toggle('pp-error', error);
        }
        function clearFields() {
            for (const field of fields) {
                field.image.removeAttribute('src');
                field.input.value = '';
            }
            poses.replaceChildren();
            fields = [];
        }
        function updateSave() {
            const library = getLibrary();
            save.disabled = busy || library.error || !petName(name.value)
                || (!editingId && library.pets.length >= MAX_PETS) || drafts.some(draft => !draft);
        }
        function render() {
            dialog.setAttribute('aria-busy', String(busy));
            if (fields.length !== drafts.length) {
                clearFields();
                fields = drafts.map((_, index) => createField(index));
            }
            fields.forEach((field, index) => {
                field.input.disabled = busy;
                field.pick.disabled = busy;
                field.drop.disabled = busy;
                field.image.hidden = !drafts[index];
                field.empty.hidden = Boolean(drafts[index]);
                if (drafts[index]) {
                    if (field.image.src !== drafts[index].src) field.image.src = drafts[index].src;
                }
                else field.image.removeAttribute('src');
            });
            const pets = getLibrary().pets;
            const key = JSON.stringify(pets.map(pet => [pet.id, pet.name || t('custom')]));
            if (key !== choicesKey) {
                choice.replaceChildren(new Option(t('newPet'), ''));
                for (const pet of pets) choice.append(new Option(pet.name || t('custom'), pet.id));
                choicesKey = key;
            }
            choice.value = editingId;
            choice.options[0].disabled = pets.length >= MAX_PETS;
            choice.disabled = name.disabled = busy;
            newPet.disabled = busy || getLibrary().error || pets.length >= MAX_PETS;
            dialog.querySelector('[data-pp-pet-count]').textContent = `${t('savedPets')}: ${pets.length} / ${MAX_PETS}`;
            updateSave();
            remove.disabled = busy || !editingId;
            add.disabled = busy || drafts.length >= MAX_CUSTOM_FRAMES;
            dialog.querySelector('[data-pp-count]').textContent = `${t('frames')}: ${drafts.length} / ${MAX_CUSTOM_FRAMES}`;
        }
        function dispose() {
            if (signal.aborted) return;
            controller.abort();
            clearFields();
            dialog.close();
            dialog.remove();
            drafts = [];
            closeManager = null;
            if (root.isConnected && !listeners.signal.aborted) root.querySelector('#pp-manage').focus();
        }
        closeManager = dispose;
        dialog.addEventListener('close', dispose, { signal });
        dialog.addEventListener('keydown', event => event.stopPropagation(), { signal });
        dialog.querySelector('[data-pp-close]').addEventListener('click', dispose, { signal });
        save.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            message('working');
            render();
            let saving = false;
            try {
                const frames = collectFrames(drafts, signal);
                saving = true;
                const saved = await savePet({ frames, name: petName(name.value) }, editingId);
                if (signal.aborted) return;
                editingId = saved.id;
                name.value = saved.name;
                message('saved');
            } catch (error) {
                if (!signal.aborted) message(saving ? (['petLimit', 'petNameRequired'].includes(error.message) ? error.message : 'storageError')
                    : (['imagesTooLarge', 'allImages'].includes(error.message) ? error.message : 'imageDecode'), true);
            } finally {
                if (!signal.aborted) { busy = false; render(); }
            }
        }, { signal });
        remove.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            message('working');
            render();
            try {
                await removePet(editingId);
                if (signal.aborted) return;
                drafts = Array(MIN_CUSTOM_FRAMES).fill(null);
                editingId = '';
                name.value = '';
                message('removed');
            } catch {
                if (!signal.aborted) message('storageError', true);
            } finally {
                if (!signal.aborted) { busy = false; render(); }
            }
        }, { signal });
        translateElement(dialog);
        document.body.append(dialog);
        render();
        message('loading');
        dialog.showModal();
        void (async () => {
            try {
                const pets = await loadLibrary();
                signal.throwIfAborted();
                const selected = getSettings().customPetId;
                await editPet(pets.some(pet => pet.id === selected) ? selected : pets[0]?.id || '');
            } catch (error) {
                if (!signal.aborted) {
                    message(['imageDecode', 'imageDimensions'].includes(error.message) ? error.message : 'storageError', true);
                }
            } finally {
                if (!signal.aborted) { busy = false; render(); }
            }
        })();
    }

    function destroy() {
        listeners.abort();
        closeManager?.();
        root.remove();
    }

    refresh();
    return { root, refresh, destroy };
}
