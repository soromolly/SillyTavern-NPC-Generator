import {
    getContext,
    extension_prompt_types,
    extension_prompt_roles,
} from '../../../extensions.js';
import { PROMPT_KEY } from './config.js';
import { getNpcList } from './storage.js';
import { npcToPromptText } from './generator.js';

const POSITION_MAP = {
    IN_PROMPT: extension_prompt_types.IN_PROMPT,
    IN_CHAT: extension_prompt_types.IN_CHAT,
    BEFORE_PROMPT: extension_prompt_types.BEFORE_PROMPT,
};

export function syncPrompt(settings) {
    const ctx = getContext();
    const list = getNpcList();
    const enabled = list.filter(n => n.enabled);

    let text = '';
    if (settings.enabled && enabled.length > 0) {
        text = enabled.map(npcToPromptText).join('\n\n');
    }

    const position = POSITION_MAP[settings.promptPosition] ?? extension_prompt_types.IN_PROMPT;
    const depth = position === extension_prompt_types.IN_CHAT
        ? (settings.promptDepth ?? 4)
        : 4;

    ctx.setExtensionPrompt(
        PROMPT_KEY,
        text,
        position,
        depth,
        false,
        extension_prompt_roles.SYSTEM,
    );
}
