import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireParent, AuthRequest } from '../middleware/auth';
import { awardTaskPoints, isUuid } from '../lib/rewards';

const router = Router();
router.use(authMiddleware);

const MAX_ADJUST = 10000;

const parseWholePoints = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isInteger(n) ? n : null;
};

const cleanNote = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().slice(0, 200);
    return trimmed || null;
};

const memberBelongsToFamily = async (memberId: unknown, familyId: string | undefined) => {
    if (!isUuid(memberId)) return false;
    const result = await query('SELECT id FROM family_members WHERE id = $1 AND user_id = $2', [memberId, familyId]);
    return result.rows.length > 0;
};

// Everyone in the family can see balances and pending approvals.
router.get('/summary', async (req: AuthRequest, res) => {
    try {
        const members = await query(
            `SELECT m.id, m.name, m.color, m.role,
                    COALESCE(SUM(t.points), 0)::int AS balance,
                    COALESCE(SUM(t.points) FILTER (WHERE t.points > 0), 0)::int AS earned,
                    COALESCE(-SUM(t.points) FILTER (WHERE t.points < 0), 0)::int AS redeemed
             FROM family_members m
             LEFT JOIN reward_transactions t ON t.member_id = m.id
             WHERE m.user_id = $1
             GROUP BY m.id
             ORDER BY m.name ASC`,
            [req.userId]
        );
        const pending = await query(
            `SELECT t.id, t.title, t.points, t.assigned_to, m.name AS member_name
             FROM tasks t
             LEFT JOIN family_members m ON m.id = t.assigned_to
             WHERE t.user_id = $1 AND t.pending_approval = TRUE
             ORDER BY t.created_at DESC`,
            [req.userId]
        );
        res.json({ success: true, data: { members: members.rows, pending: pending.rows } });
    } catch (error) {
        console.error('Get rewards summary error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/transactions', async (req: AuthRequest, res) => {
    try {
        const memberId = req.query.member_id;
        if (memberId !== undefined && !isUuid(memberId)) {
            return res.status(400).json({ success: false, error: 'Invalid member' });
        }
        const params: unknown[] = [req.userId];
        let filter = '';
        if (memberId) {
            params.push(memberId);
            filter = 'AND rt.member_id = $2';
        }
        const result = await query(
            `SELECT rt.id, rt.member_id, m.name AS member_name, rt.task_id, rt.points, rt.type, rt.note, rt.created_at
             FROM reward_transactions rt
             JOIN family_members m ON m.id = rt.member_id
             WHERE rt.user_id = $1 ${filter}
             ORDER BY rt.created_at DESC
             LIMIT 50`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get reward transactions error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Parent approves a task a child marked as done: the task completes and the points are paid out.
router.post('/approve/:taskId', requireParent, async (req: AuthRequest, res) => {
    try {
        if (!isUuid(req.params.taskId)) {
            return res.status(400).json({ success: false, error: 'Invalid task' });
        }
        const result = await query(
            `UPDATE tasks
             SET is_completed = TRUE, completed_at = NOW(), pending_approval = FALSE
             WHERE id = $1 AND user_id = $2 AND pending_approval = TRUE
             RETURNING *`,
            [req.params.taskId, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No pending task found' });
        }
        await awardTaskPoints(result.rows[0]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Approve task error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Parent sends the task back: it stays open and no points are given.
router.post('/reject/:taskId', requireParent, async (req: AuthRequest, res) => {
    try {
        if (!isUuid(req.params.taskId)) {
            return res.status(400).json({ success: false, error: 'Invalid task' });
        }
        const result = await query(
            `UPDATE tasks SET pending_approval = FALSE
             WHERE id = $1 AND user_id = $2 AND pending_approval = TRUE
             RETURNING id`,
            [req.params.taskId, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'No pending task found' });
        }
        res.json({ success: true, message: 'Task sent back' });
    } catch (error) {
        console.error('Reject task error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Parent spends a member's points on something (a treat, screen time, ...).
router.post('/redeem', requireParent, async (req: AuthRequest, res) => {
    try {
        const { member_id, points, note } = req.body ?? {};
        const amount = parseWholePoints(points);
        if (amount === null || amount <= 0 || amount > MAX_ADJUST) {
            return res.status(400).json({ success: false, error: 'Points must be a whole number above 0' });
        }
        if (!(await memberBelongsToFamily(member_id, req.userId))) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        // One statement checks the balance and inserts, so two quick requests cannot overspend.
        const result = await query(
            `INSERT INTO reward_transactions (user_id, member_id, points, type, note)
             SELECT $1, $2, $3, 'redeemed', $4
             WHERE (SELECT COALESCE(SUM(points), 0) FROM reward_transactions
                    WHERE user_id = $1 AND member_id = $2) >= $5
             RETURNING *`,
            [req.userId, member_id, -amount, cleanNote(note), amount]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Not enough points' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Redeem points error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Parent adds or removes points by hand (a bonus, or fixing a mistake).
router.post('/adjust', requireParent, async (req: AuthRequest, res) => {
    try {
        const { member_id, points, note } = req.body ?? {};
        const amount = parseWholePoints(points);
        if (amount === null || amount === 0 || Math.abs(amount) > MAX_ADJUST) {
            return res.status(400).json({ success: false, error: 'Points must be a whole number, not 0' });
        }
        if (!(await memberBelongsToFamily(member_id, req.userId))) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        const result = await query(
            `INSERT INTO reward_transactions (user_id, member_id, points, type, note)
             VALUES ($1, $2, $3, 'adjusted', $4) RETURNING *`,
            [req.userId, member_id, amount, cleanNote(note)]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Adjust points error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
