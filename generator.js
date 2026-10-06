import { getDatabase } from './loader.js';
import { generateName } from './names.js';

function entryValue(entry) {
    return typeof entry === 'string' ? entry : entry.value;
}

function weightedRandom(entries) {
    const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
        roll -= (entry.weight ?? 1);
        if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
}

function collectAllSelected(selected) {
    const set = new Set();
    for (const v of Object.values(selected)) {
        if (Array.isArray(v)) v.forEach(x => set.add(x));
        else if (v != null) set.add(v);
    }
    return set;
}

function isAllowed(entry, selected, activeTags) {
    const tags = entry.tags ?? ['any'];
    if (!tags.some(t => activeTags.includes(t))) return false;

    if (entry.requires) {
        for (const [cat, allowedRaw] of Object.entries(entry.requires)) {
            const allowed = Array.isArray(allowedRaw) ? allowedRaw : [allowedRaw];
            const currentRaw = selected[cat];
            const current = Array.isArray(currentRaw) ? currentRaw : [currentRaw];
            if (!current.some(c => allowed.includes(c))) return false;
        }
    }

    if (entry.excludes) {
        const all = collectAllSelected(selected);
        if (entry.excludes.some(ex => all.has(ex))) return false;
    }

    return true;
}

/**
 * Оставляет только те значения, которые не отключены пользователем
 * в разделе «Характеристики».
 */
function filterDisabled(entries, catKey, disabledValues) {
    const disabled = disabledValues?.[catKey];
    if (!disabled || !disabled.length) return entries;
    return entries.filter(e => !disabled.includes(entryValue(e)));
}

function pickMultiple(pool, count, selected, activeTags) {
    const picked = [];
    const working = [...pool];
    const tempSelected = { ...selected };

    for (let i = 0; i < count && working.length > 0; i++) {
        const available = working.filter(e => isAllowed(e, tempSelected, activeTags));
        if (!available.length) break;
        const chosen = weightedRandom(available);
        picked.push(chosen);
        working.splice(working.indexOf(chosen), 1);
        tempSelected[`__picked_${i}`] = entryValue(chosen);
    }

    return picked;
}

export function generateNPC(activeTags, disabledValues = {}) {
    const db = getDatabase();
    if (!db) throw new Error('База NPC не загружена');

    const npc = {
        id: `npc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        enabled: true,
        name: '',
        traits: {},
    };

    const selected = {};

    for (const [catKey, cat] of Object.entries(db.categories)) {
        const allEntries = cat.entries ?? [];
        const entries = filterDisabled(allEntries, catKey, disabledValues);
        if (!entries.length) continue;

        if (cat.type === 'single') {
            const available = entries.filter(e => isAllowed(e, selected, activeTags));
            if (!available.length) continue;
            const chosen = weightedRandom(available);
            const value = entryValue(chosen);
            selected[catKey] = value;
            npc.traits[catKey] = value;
        } else if (cat.type === 'multi') {
            const count = cat.count ?? 1;
            const picked = pickMultiple(entries, count, selected, activeTags);
            const values = picked.map(entryValue);
            selected[catKey] = values;
            npc.traits[catKey] = values;
        }
    }

    const raceValue = npc.traits.race ?? 'human';
    const raceKey = mapRaceToKey(raceValue);
    npc.name = generateName(raceKey);

    return npc;
}

function mapRaceToKey(raceLabel) {
    const map = {
        'человек': 'human',
        'эльф': 'elf',
        'полуэльф': 'elf',
        'дварф': 'dwarf',
        'орк': 'orc',
        'полурослик': 'human',
        'зверолюд': 'beast',
        'демон': 'demon',
        'ангел': 'angel',
    };
    return map[raceLabel] ?? 'human';
}

export function npcToPromptText(npc) {
    const db = getDatabase();
    if (!db) return '';
    const lines = [`[NPC] Имя: ${npc.name}`];
    for (const [catKey, cat] of Object.entries(db.categories)) {
        const val = npc.traits[catKey];
        if (val == null) continue;
        const text = Array.isArray(val) ? val.join(', ') : val;
        if (!text) continue;
        lines.push(`${cat.label}: ${text}`);
    }
    return lines.join('\n');
}

export function npcSummary(npc) {
    const parts = [];
    if (npc.traits.race) parts.push(npc.traits.race);
    if (npc.traits.occupation) parts.push(npc.traits.occupation);
    return parts.join(' · ');
}
