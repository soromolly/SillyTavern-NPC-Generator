import { extension_settings } from '../../../extensions.js';
import { eventSource, event_types } from '../../../../script.js';
import { MODULE_NAME, EXTENSION_NAME, DEFAULT_SETTINGS } from './config.js';
import { loadDatabase } from './loader.js';
import { renderUI, refreshUI } from './ui.js';
import { syncPrompt } from './prompt.js';

jQuery(async () => {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = { ...DEFAULT_SETTINGS };
    }
    const settings = extension_settings[MODULE_NAME];

    try {
        await loadDatabase();
    } catch (e) {
        console.error(`[${EXTENSION_NAME}]`, e);
        toastr?.error?.('NPC Generator: не удалось загрузить базу');
        return;
    }

    renderUI(settings);
    syncPrompt(settings);

    eventSource.on(event_types.CHAT_CHANGED, () => {
        refreshUI();
        syncPrompt(settings);
    });

    console.log(`[${EXTENSION_NAME}] Загружено`);
});
