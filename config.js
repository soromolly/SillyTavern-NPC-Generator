export const MODULE_NAME = 'npc_generator';
export const EXTENSION_NAME = 'NPC Generator';
export const PROMPT_KEY = 'npc_generator_info';
export const STORAGE_KEY = 'npc_generator_list';

// База лежит в корне расширения, рядом с этим файлом
export const DB_PATH = './npc_database.json';

// Значения ролей для setExtensionPrompt.
// Не импортируем из extensions.js, потому что не во всех версиях ST
// эта константа экспортируется — определяем локально.
// SYSTEM = 0, USER = 1, ASSISTANT = 2 (совпадает со внутренними значениями ST).
export const EXTENSION_PROMPT_ROLES = {
    SYSTEM: 0,
    USER: 1,
    ASSISTANT: 2,
};

export const DEFAULT_SETTINGS = {
    enabled: true,
    activeTags: ['any', 'fantasy'],
    promptDepth: 4,
    promptPosition: 'IN_PROMPT', // IN_PROMPT | IN_CHAT | BEFORE_PROMPT
};

export const AVAILABLE_TAGS = ['any', 'fantasy', 'modern', 'dark', 'romance', 'scifi'];
