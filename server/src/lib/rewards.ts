import { query } from '../db';
import { MAX_TASK_POINTS } from '@famhub/shared';

export const isUuid = (value: unknown): value is string =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Parse a "points" value from a request. Returns null when it is not a valid whole number. */
export const parsePoints = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return 0;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > MAX_TASK_POINTS) return null;
    return n;
};

/**
 * Validate the reward fields of a task. Returns an error message, or null when valid.
 * The member must belong to the same family, and a task with points needs someone to earn them.
 */
export const checkRewardFields = async (
    familyId: string | undefined,
    points: number,
    assignedTo: string | null
): Promise<string | null> => {
    if (assignedTo) {
        if (!isUuid(assignedTo)) return 'Invalid family member';
        const member = await query('SELECT id FROM family_members WHERE id = $1 AND user_id = $2', [
            assignedTo,
            familyId,
        ]);
        if (member.rows.length === 0) return 'Family member not found';
    }
    if (points > 0 && !assignedTo) return 'Choose who earns the points';
    return null;
};

/** Give the assigned member the task's points. Safe to call twice: a task pays out once. */
export const awardTaskPoints = async (task: {
    id: string;
    user_id: string;
    title: string;
    points: number;
    assigned_to: string | null;
}) => {
    if (!task.assigned_to || !(task.points > 0)) return;
    await query(
        `INSERT INTO reward_transactions (user_id, member_id, task_id, points, type, note)
         VALUES ($1, $2, $3, $4, 'earned', $5)
         ON CONFLICT (task_id) WHERE type = 'earned' DO NOTHING`,
        [task.user_id, task.assigned_to, task.id, task.points, `Completed: ${task.title}`]
    );
};

/** Take the points back when a parent reopens a completed task. */
export const revokeTaskPoints = async (taskId: string) => {
    await query(`DELETE FROM reward_transactions WHERE task_id = $1 AND type = 'earned'`, [taskId]);
};
