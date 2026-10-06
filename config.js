export const MODULE_NAME = 'npc_generator';
export const EXTENSION_NAME = 'NPC Generator';
export const PROMPT_KEY = 'npc_generator_info';
export const STORAGE_KEY = 'npc_generator_list';

export const DB_PATH = './npc_database.json';

export const DEFAULT_SETTINGS = {
    enabled: true,
    activeTags: ['any', 'fantasy'],
    promptDepth: 4,
    promptPosition: 'IN_PROMPT', // IN_PROMPT | IN_CHAT | BEFORE_PROMPT
};

export const AVAILABLE_TAGS = ['any', 'fantasy', 'modern', 'dark', 'romance', 'scifi'];
