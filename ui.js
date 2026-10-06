import { getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
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

                    <div class="npc-section-title">Сгенерированные NPC</div>
                    <div id="npc-gen-list" class="npc-list"></div>

                    <div class="npc-section-title" style="margin-top:14px;">Характеристики</div>
                    <div class="npc-hint">
                        Здесь можно посмотреть, какие значения есть в базе, и отключить те,
                        которые не должны появляться у NPC. Имена генерируются процедурно
                        по слогам в зависимости от расы.
                    </div>
                    <div id="npc-gen-categories" class="npc-categories"></div>

                </div>
            </div>
        </div>
    `;

    $('#extensions_settings').append(html);

    bindEvents();
    refreshList();
    renderCategories();
}

function bindEvents() {
    $('#npc-gen-enabled').on('change', function () {
        currentSettings.enabled = $(this).prop('checked');
        saveSettingsDebounced();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-tags').on('change', '.npc-tag-cb', () => {
        currentSettings.activeTags = $('.npc-tag-cb:checked').map((_, el) => el.value).get();
        if (!currentSettings.activeTags.length) currentSettings.activeTags = ['any'];
        saveSettingsDebounced();
    });

    $('#npc-gen-position').on('change', function () {
        currentSettings.promptPosition = $(this).val();
        saveSettingsDebounced();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-depth').on('change', function () {
        currentSettings.promptDepth = Number($(this).val()) || 0;
        saveSettingsDebounced();
        syncPrompt(currentSettings);
    });

    $('#npc-gen-create').on('click', () => {
        try {
            const npc = generateNPC(currentSettings.activeTags, currentSettings.disabledValues);
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

    // Раскрытие/сворачивание категорий в разделе «Характеристики»
    $('#npc-gen-categories').on('click', '.npc-cat-header', function (e) {
        if ($(e.target).is('button, i')) return;
        $(this).parent().toggleClass('expanded');
    });

    // Чекбокс отдельного значения
    $('#npc-gen-categories').on('change', '.npc-entry-cb', function () {
        const cat = $(this).data('cat');
        const value = $(this).data('value');
        const checked = $(this).prop('checked');

        if (!currentSettings.disabledValues) currentSettings.disabledValues = {};
        if (!currentSettings.disabledValues[cat]) currentSettings.disabledValues[cat] = [];

        const arr = currentSettings.disabledValues[cat];
        if (checked) {
            const idx = arr.indexOf(value);
            if (idx >= 0) arr.splice(idx, 1);
        } else {
            if (!arr.includes(value)) arr.push(value);
        }

        if (arr.length === 0) delete currentSettings.disabledValues[cat];

        saveSettingsDebounced();
        updateCatCounter(cat);
    });

    // Кнопка «все / ничего» для категории
    $('#npc-gen-categories').on('click', '.npc-cat-toggle-all', function (e) {
        e.stopPropagation();
        const $cat = $(this).closest('.npc-cat');
        const cat = $cat.data('cat');
        const allChecked = $cat.find('.npc-entry-cb:checked').length === $cat.find('.npc-entry-cb').length;
        const turnOn = !allChecked;

        $cat.find('.npc-entry-cb').each(function () {
            $(this).prop('checked', turnOn);
        });

        if (!currentSettings.disabledValues) currentSettings.disabledValues = {};
        if (turnOn) {
            delete currentSettings.disabledValues[cat];
        } else {
            currentSettings.disabledValues[cat] = $cat.find('.npc-entry-cb').map((_, el) => $(el).data('value')).get();
        }

        saveSettingsDebounced();
        updateCatCounter(cat);
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

/**
 * Раздел «Характеристики»: список категорий, внутри — все значения из базы
 * с чекбоксами. Отключённые не будут использоваться при генерации.
 */
function renderCategories() {
    const db = getDatabase();
    const $container = $('#npc-gen-categories');
    $container.empty();

    if (!db || !db.categories) {
        $container.append('<div class="npc-empty">База не загружена.</div>');
        return;
    }

    for (const [catKey, cat] of Object.entries(db.categories)) {
        const entries = cat.entries ?? [];
        const disabled = currentSettings.disabledValues?.[catKey] ?? [];

        const items = entries.map(entry => {
            const value = typeof entry === 'string' ? entry : entry.value;
            const isOn = !disabled.includes(value);
            return `
                <label class="checkbox_label npc-entry-label">
                    <input type="checkbox" class="npc-entry-cb"
                        data-cat="${escapeHtml(catKey)}"
                        data-value="${escapeHtml(value)}"
                        ${isOn ? 'checked' : ''}>
                    <span>${escapeHtml(value)}</span>
                </label>
            `;
        }).join('');

        const catHtml = `
            <div class="npc-cat" data-cat="${escapeHtml(catKey)}">
                <div class="npc-cat-header">
                    <i class="fa-solid fa-chevron-right npc-cat-arrow"></i>
                    <b>${escapeHtml(cat.label ?? catKey)}</b>
                    <span class="npc-cat-count"></span>
                    <button class="menu_button npc-cat-toggle-all" title="Включить/отключить все">⇄</button>
                </div>
                <div class="npc-cat-body">
                    <div class="npc-cat-items">${items}</div>
                </div>
            </div>
        `;

        $container.append(catHtml);
    }

    // Проставляем счётчики после вставки в DOM
    $('.npc-cat').each(function () {
        updateCatCounter($(this).data('cat'));
    });
}

function updateCatCounter(catKey) {
    const $cat = $(`.npc-cat[data-cat="${cssEscape(catKey)}"]`);
    const total = $cat.find('.npc-entry-cb').length;
    const on = $cat.find('.npc-entry-cb:checked').length;
    $cat.find('.npc-cat-count').text(`${on}/${total}`);
    $cat.toggleClass('npc-cat-empty', on === 0);
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function cssEscape(str) {
    // Минимально достаточно для наших ключей, но на всякий случай
    return String(str).replace(/["\\]/g, '\\$&');
}
