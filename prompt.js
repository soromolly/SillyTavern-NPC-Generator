import { getContext } from '../../../extensions.js';
import {
    PROMPT_KEY,
    EXTENSION_PROMPT_ROLES,
    EXTENSION_PROMPT_TYPES,
} from './config.js';
import { getNpcList } from './storage.js';
import { npcToPromptText } from './generator.js';

const POSITION_MAP = {
    IN_PROMPT: EXTENSION_PROMPT_TYPES.IN_PROMPT,
    IN_CHAT: EXTENSION_PROMPT_TYPES.IN_CHAT,
    BEFORE_PROMPT: EXTENSION_PROMPT_TYPES.BEFORE_PROMPT,
};

export function syncPrompt(settings) {
    const ctx = getContext();
    const list = getNpcList();
    const enabled = list.filter(n => n.enabled);

    let text = '';
    if (settings.enabled && enabled.length > 0) {
        text = enabled.map(npcToPromptText).join('\n\n');
    }

    const position = POSITION_MAP[settings.promptPosition] ?? EXTENSION_PROMPT_TYPES.IN_PROMPT;
    const depth = position === EXTENSION_PROMPT_TYPES.IN_CHAT
        ? (settings.promptDepth ?? 4)
        : 4;

    ctx.setExtensionPrompt(
        PROMPT_KEY,
        text,
        position,
        depth,
        false,
        EXTENSION_PROMPT_ROLES.SYSTEM,
    );
}
