import { getContext } from '../../../extensions.js';
import { STORAGE_KEY } from './config.js';

function ensureMetadata() {
    const ctx = getContext();
    if (!ctx.chat_metadata) ctx.chat_metadata = {};
    return ctx.chat_metadata;
}

export function getNpcList() {
    const md = ensureMetadata();
    return Array.isArray(md[STORAGE_KEY]) ? md[STORAGE_KEY] : [];
}

export function saveNpcList(list) {
    const ctx = getContext();
    const md = ensureMetadata();
    md[STORAGE_KEY] = list;
    if (typeof ctx.saveMetadata === 'function') {
        ctx.saveMetadata();
    }
}

export function addNpc(npc) {
    const list = getNpcList();
    list.push(npc);
    saveNpcList(list);
    return list;
}

export function removeNpc(id) {
    const list = getNpcList().filter(n => n.id !== id);
    saveNpcList(list);
    return list;
}

export function toggleNpc(id, enabled) {
    const list = getNpcList();
    const npc = list.find(n => n.id === id);
    if (npc) npc.enabled = enabled;
    saveNpcList(list);
    return list;
}

export function updateNpc(id, patch) {
    const list = getNpcList();
    const idx = list.findIndex(n => n.id === id);
    if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
        saveNpcList(list);
    }
    return list;
}

export function clearNpcs() {
    saveNpcList([]);
}
