import { customFrames } from './pet-core.js';

export const MAX_PETS = 5;
export const petName = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 64) : '';
export const validPetId = id => typeof id === 'string' && /^(legacy|[a-f0-9-]{36})$/i.test(id);

export function createPetLibrary(account) {
    let closed = false;
    let connection;
    let opening;
    let cancelOpen;
    const transactions = new Set();
    const dataKey = id => {
        if (!validPetId(id)) throw new Error('petMissing');
        return `${account}:${id}`;
    };
    const metadata = value => {
        if (!value) return { pets: [], migrated: false };
        if (!Array.isArray(value.pets) || value.pets.length > MAX_PETS
            || Array.from(value.pets).some(pet => !validPetId(pet?.id) || typeof pet.name !== 'string')
            || new Set(value.pets.map(pet => pet.id)).size !== value.pets.length) throw new Error('storageError');
        return { pets: value.pets.map(pet => ({ id: pet.id, name: petName(pet.name) })), migrated: Boolean(value.migrated) };
    };

    function open() {
        if (closed) return Promise.reject(new DOMException('Aborted', 'AbortError'));
        return opening ||= new Promise((resolve, reject) => {
            const request = indexedDB.open('puppys-pals-library', 1);
            let failed = false;
            const fail = () => {
                if (failed) return;
                failed = true;
                clearTimeout(timer);
                if (cancelOpen === fail) cancelOpen = null;
                reject((request.readyState === 'done' && request.error) || new Error('storageError'));
            };
            const timer = setTimeout(fail, 10000);
            cancelOpen = fail;
            request.onupgradeneeded = () => {
                if (closed || failed) request.transaction.abort();
                else request.result.createObjectStore('pets');
            };
            request.onerror = request.onblocked = fail;
            request.onsuccess = () => {
                clearTimeout(timer);
                if (cancelOpen === fail) cancelOpen = null;
                if (closed || failed) { request.result.close(); reject(new DOMException('Aborted', 'AbortError')); return; }
                connection = request.result;
                connection.onversionchange = close;
                resolve(connection);
            };
        }).catch(error => { opening = null; throw error; });
    }

    async function run(mode, work) {
        const db = await open();
        if (closed) throw new DOMException('Aborted', 'AbortError');
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pets', mode);
            transactions.add(tx);
            let result, failure;
            const fail = error => { failure = error; tx.abort(); };
            const guard = callback => event => { try { callback(event.target.result); } catch (error) { fail(error); } };
            tx.oncomplete = () => { transactions.delete(tx); resolve(result); };
            tx.onabort = () => { transactions.delete(tx); reject(failure || tx.error || new DOMException('Aborted', 'AbortError')); };
            try { work(tx.objectStore('pets'), value => { result = value; }, guard); } catch (error) { fail(error); }
        });
    }

    function migrate(legacy) {
        return run('readwrite', (store, done, guard) => {
            store.get(account).onsuccess = guard(value => {
                const meta = metadata(value);
                if (!meta.migrated) {
                    if (legacy) {
                        const frames = customFrames(legacy);
                        if (!frames) throw new Error('imageDecode');
                        if (meta.pets.length >= MAX_PETS) throw new Error('petLimit');
                        meta.pets.push({ id: 'legacy', name: '' });
                        store.put({ frames }, dataKey('legacy'));
                    }
                    meta.migrated = true;
                    store.put(meta, account);
                }
                done(meta.pets);
            });
        });
    }

    function load(id) {
        return run('readonly', (store, done, guard) => {
            store.get(dataKey(id)).onsuccess = guard(value => {
                const frames = customFrames(value);
                if (!frames) throw new Error('petMissing');
                done({ id, frames });
            });
        });
    }

    function save(pet) {
        const frames = customFrames(pet);
        const name = petName(pet.name);
        if (!frames) return Promise.reject(new Error('imagesTooLarge'));
        if (!name) return Promise.reject(new Error('petNameRequired'));
        return run('readwrite', (store, done, guard) => {
            store.get(account).onsuccess = guard(value => {
                const meta = metadata(value);
                const index = meta.pets.findIndex(entry => entry.id === pet.id);
                if (index < 0 && meta.pets.length >= MAX_PETS) throw new Error('petLimit');
                const entry = { id: pet.id, name };
                if (index < 0) meta.pets.push(entry);
                else meta.pets[index] = entry;
                store.put({ frames }, dataKey(pet.id));
                store.put(meta, account);
                done(meta.pets);
            });
        });
    }

    function remove(id) {
        return run('readwrite', (store, done, guard) => {
            store.get(account).onsuccess = guard(value => {
                const meta = metadata(value);
                meta.pets = meta.pets.filter(pet => pet.id !== id);
                store.delete(dataKey(id));
                store.put(meta, account);
                done(meta.pets);
            });
        });
    }

    function close() {
        if (closed) return;
        closed = true;
        cancelOpen?.();
        for (const tx of transactions) tx.abort();
        connection?.close();
    }

    return { migrate, load, save, remove, close };
}
