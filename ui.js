import { getContext } from '../../../extensions.js';
import { MODULE_NAME, EXTENSION_NAME, AVAILABLE_TAGS } from './config.js';
import { generateNPC, npcSummary } from './generator.js';
import { getNpcList, addNpc, removeNpc, toggleNpc, clearNpcs } from './storage.js';
import { getDatabase } from './loader.js';
import { syncPrompt } from './prompt.js';

let currentSettings = null;

export function renderUI(settings) {
    currentSettings = settings;

    const tagCheckboxes = AVAILABLE_TAGS.map(tag => `
        <label class="checkbox_label" style="margin:0;">
            <input type="checkbox" class="npc-tag-cb" value="${tag.value}"
                ${settings.activeTags.includes(tag.value) ? 'checked' : ''}>
            <span>${tag.label}</span>
        </label>
    `).join('');

    const html = `
        <div class="npc-generator-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>${EXTENSION_NAME}</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">

                    <label class="checkbox_label">
                        <input type="checkbox" id="npc-gen-enabled" ${settings.enabled ? 'checked' : ''}>
                        <span>Внедрять NPC в промпт</span>
                    </label>

                    <label class="checkbox_label" style="margin-top: 6px;">
                        <span>Теги сеттинга:</span>
                    </label>
                    <div id="npc-gen-tags" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                        ${tagCheckboxes}
                    </div>

                    <label class="checkbox_label">
                        <span>Позиция промпта:</span>
                        <select id="npc-gen-position" class="text_pole">
                            <option value="IN_PROMPT" ${settings.promptPosition === 'IN_PROMPT' ? 'selected' : ''}>В основной промпт</option>
                            <option value="IN_CHAT" ${settings.promptPosition === 'IN_CHAT' ? 'selected' : ''}>В глубину чата</option>
                            <option value="BEFORE_PROMPT" ${settings.promptPosition === 'BEFORE_PROMPT' ? 'selected' : ''}>Перед промптом</option>
                        </select>
                    </label>

                    <label class="checkbox_label">
                        <span>Глубина (для "в глубину чата"):</span>
                        <input type="number" id="npc-gen-depth" class="text_pole" min="0" max="20"
                            value="${settings.promptDepth ?? 4}" style="max-width: 80px;">
                    </label>

                    <div style="display:flex; gap:6px; margin: 10px 0;">
                        <button id="npc-gen-create" class="menu_button">
                            <i class="fa-solid fa-dice"></i> Сгенерировать NPC
                        </button>
                        <button id="npc-gen-clear" class="menu_button">
                            <i class="fa-solid fa-trash"></i> Очистить
                        </button>
                    </div>

                    <div id="npc-gen-list" class="npc-list"></div>
                </div>
            </div>
        </div>
    `;

    $('#extensions_settings').append(html);

    bindEvents();
    refreshList();
}

function bindEvents() {
    $('#npc-gen-enabled').on('change', function () {
        currentSettings.enabled = $(this).prop('checked');
        syncPrompt(currentSettings);
    });

    $('#npc-gen-tags').on('change', '.npc-tag-cb', () => {
        currentSettings.activeTags = $('.npc-tag-cb:checked').map((_, el) => el.value).get();
        if (!currentSettings.activeTags.length) currentSettings.activeTags = ['any'];
    });

    $('#npc-gen-position').on('change', function () {
        currentSettings.promptPosition = $(this).val();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-depth').on('change', function () {
        currentSettings.promptDepth = Number($(this).val()) || 0;
        syncPrompt(currentSettings);
    });

    $('#npc-gen-create').on('click', () => {
        try {
            const npc = generateNPC(currentSettings.activeTags);
            addNpc(npc);
            refreshList();
            syncPrompt(currentSettings);
            toastr?.success?.(`Создан NPC: ${npc.name}`);
        } catch (e) {
            console.error(`[${EXTENSION_NAME}]`, e);
            toastr?.error?.(`Ошибка: ${e.message}`);
        }
    });

    $('#npc-gen-clear').on('click', () => {
        if (!confirm('Удалить всех NPC из этого чата?')) return;
        clearNpcs();
        refreshList();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-list').on('change', '.npc-toggle', function () {
        const id = $(this).data('id');
        toggleNpc(id, $(this).prop('checked'));
        syncPrompt(currentSettings);
    });

    $('#npc-gen-list').on('click', '.npc-remove', function () {
        const id = $(this).data('id');
        removeNpc(id);
        refreshList();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-list').on('click', '.npc-header', function (e) {
        if ($(e.target).is('input, button, i')) return;
        $(this).parent().toggleClass('expanded');
    });
}

export function refreshList() {
    const list = getNpcList();
    const $container = $('#npc-gen-list');
    $container.empty();

    if (!list.length) {
        $container.append('<div class="npc-empty">Пока никого не создано.</div>');
        return;
    }

    for (const npc of list) {
        const summary = npcSummary(npc);
        const card = $(`
            <div class="npc-card ${npc.enabled ? 'enabled' : ''}">
                <div class="npc-header">
                    <input type="checkbox" class="npc-toggle" data-id="${npc.id}" ${npc.enabled ? 'checked' : ''}>
                    <span class="npc-name">${escapeHtml(npc.name)}</span>
                    <span class="npc-summary">${escapeHtml(summary)}</span>
                    <button class="menu_button npc-remove" data-id="${npc.id}" title="Удалить">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="npc-details">${renderTraits(npc)}</div>
            </div>
        `);
        $container.append(card);
    }
}

export function refreshUI() {
    refreshList();
}

/**
 * Показывает характеристики NPC, используя русские названия категорий
 * из базы (cat.label), а не сырые ключи (race, age, ...).
 */
function renderTraits(npc) {
    const db = getDatabase();
    const rows = Object.entries(npc.traits).map(([key, val]) => {
        const text = Array.isArray(val) ? val.join(', ') : val;
        const cat = db?.categories?.[key];
        const label = cat?.label ?? key.replace(/_/g, ' ');
        return `<div class="npc-trait"><b>${escapeHtml(label)}:</b> ${escapeHtml(text)}</div>`;
    });
    return rows.join('');
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
