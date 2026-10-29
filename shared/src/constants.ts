export const API_BASE_PATH = '/api';
export const APP_NAME = 'FamHub';

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_FREQUENCIES = ['Once', 'Daily', 'Weekly', 'Monthly'] as const;
export type TaskFrequency = (typeof TASK_FREQUENCIES)[number];