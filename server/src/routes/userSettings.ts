// Stand-in for the module-toggle part of OpenFamily's real userSettings.ts.
// The real file also owns /api/auth/language, /api/auth/modules, and
// /api/auth/dashboard-prefs — add those when you build the matching features.

export const TOGGLEABLE_MODULES = [
    'budget',
    'rewards',
    'meals',
    'recipes',
    'planning',
    'integrations',
    'kiosk',
    'notes',
    'ai',
] as const;

export const parseDisabledModules = (raw: unknown): string[] => {
    if (typeof raw !== 'string' || raw.trim() === '') return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (v): v is string => typeof v === 'string' && (TOGGLEABLE_MODULES as readonly string[]).includes(v)
        );
    } catch {
        return [];
    }
};