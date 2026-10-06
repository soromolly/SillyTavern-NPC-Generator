import { DB_PATH } from './config.js';

let database = null;

export async function loadDatabase() {
    if (database) return database;

    const url = new URL(DB_PATH, import.meta.url).href;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Не удалось загрузить базу NPC (${response.status})`);
    }
    database = await response.json();
    return database;
}

export function getDatabase() {
    return database;
}
