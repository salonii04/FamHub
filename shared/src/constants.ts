export const API_BASE_PATH = '/api';
export const APP_NAME = 'FamHub';

export const TASK_PRIORITIES = ['Haute', 'Moyenne', 'Basse'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_FREQUENCIES = ['Une fois', 'Quotidien', 'Hebdomadaire', 'Mensuel'] as const;
export type TaskFrequency = (typeof TASK_FREQUENCIES)[number];