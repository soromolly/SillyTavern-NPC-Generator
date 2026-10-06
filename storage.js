import { getContext } from '../../../extensions.js';
import { STORAGE_KEY } from './config.js';

/**
 * Получить контейнер метаданных текущего чата.
 * В разных версиях ST поле называется либо chatMetadata (camelCase),
 * либо chat_metadata (snake_case). Пробуем оба.
 */
function getMetadataContainer() {
    const ctx = getContext();
    if (ctx.chatMetadata && typeof ctx.chatMetadata === 'object') {
        return ctx.chatMetadata;
    }
    if (ctx.chat_metadata && typeof ctx.chat_metadata === 'object') {
        return ctx.chat_metadata;
    }
    // На самый крайний случай — создаём своё поле на ctx,
    // чтобы хоть что-то работало в рамках сессии.
    ctx.chatMetadata = {};
    return ctx.chatMetadata;
}

/**
 * Попросить ST сохранить метаданные на диск.
 * Если функции нет — ничего страшного, ST сохранит при следующем действии.
 */
function requestSave() {
    const ctx = getContext();
    const candidates = ['saveMetadata', 'saveMetadataDebounced'];
    for (const name of candidates) {
        if (typeof ctx[name] === 'function') {
            try {
                ctx[name]();
                return;
            } catch (e) {
                console.warn('[NPC Generator] Не удалось вызвать', name, e);
            }
        }
    }
}

export function getNpcList() {
    const md = getMetadataContainer();
    return Array.isArray(md[STORAGE_KEY]) ? md[STORAGE_KEY] : [];
}

export function saveNpcList(list) {
    const md = getMetadataContainer();
    md[STORAGE_KEY] = list;
    requestSave();
}

export function addNpc(npc) {
    const md = getMetadataContainer();
    if (!Array.isArray(md[STORAGE_KEY])) md[STORAGE_KEY] = [];
    md[STORAGE_KEY].push(npc);
    requestSave();
    return md[STORAGE_KEY];
}

export function removeNpc(id) {
    const md = getMetadataContainer();
    const list = Array.isArray(md[STORAGE_KEY]) ? md[STORAGE_KEY] : [];
    md[STORAGE_KEY] = list.filter(n => n.id !== id);
    requestSave();
    return md[STORAGE_KEY];
}

export function toggleNpc(id, enabled) {
    const md = getMetadataContainer();
    const list = Array.isArray(md[STORAGE_KEY]) ? md[STORAGE_KEY] : [];
    const npc = list.find(n => n.id === id);
    if (npc) npc.enabled = enabled;
    requestSave();
    return list;
}

export function updateNpc(id, patch) {
    const md = getMetadataContainer();
    const list = Array.isArray(md[STORAGE_KEY]) ? md[STORAGE_KEY] : [];
    const idx = list.findIndex(n => n.id === id);
    if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
        requestSave();
    }
    return list;
}

export function clearNpcs() {
    const md = getMetadataContainer();
    md[STORAGE_KEY] = [];
    requestSave();
    return [];
}
