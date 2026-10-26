import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { toNullIfEmpty } from '../lib/normalize';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY due_date ASC NULLS LAST, created_at DESC',
            [req.userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    try {
        const { title, description, due_date, frequency, priority } = req.body;

        const cleanedTitle = typeof title === 'string' ? title.trim() : '';
        if (!cleanedTitle) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const result = await query(
            `INSERT INTO tasks (user_id, title, description, due_date, frequency, priority)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [
                req.userId,
                cleanedTitle,
                toNullIfEmpty(description),
                toNullIfEmpty(due_date),
                toNullIfEmpty(frequency),
                toNullIfEmpty(priority),
            ]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { title, description, is_completed, due_date, frequency, priority } = req.body;

        const existingResult = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, req.userId]);
        if (existingResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        const existing = existingResult.rows[0];

        const updates: string[] = [];
        const values: any[] = [];
        const pushUpdate = (field: string, value: any) => {
            values.push(value);
            updates.push(`${field} = $${values.length}`);
        };

        if (title !== undefined) {
            const cleanedTitle = typeof title === 'string' ? title.trim() : '';
            if (!cleanedTitle) {
                return res.status(400).json({ success: false, error: 'Title cannot be empty' });
            }
            pushUpdate('title', cleanedTitle);
        }
        if (description !== undefined) pushUpdate('description', toNullIfEmpty(description));
        if (due_date !== undefined) pushUpdate('due_date', toNullIfEmpty(due_date));
        if (frequency !== undefined) pushUpdate('frequency', toNullIfEmpty(frequency));
        if (priority !== undefined) pushUpdate('priority', toNullIfEmpty(priority));

        if (is_completed !== undefined) {
            const isCompleted = Boolean(is_completed);
            const wasCompleted = Boolean(existing.is_completed);
            pushUpdate('is_completed', isCompleted);
            if (isCompleted !== wasCompleted) {
                updates.push(`completed_at = ${isCompleted ? 'NOW()' : 'NULL'}`);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        const result = await query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`,
            [...values, id, req.userId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Exact match with the final file — no family/rewards coupling here.
router.get('/statistics', async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE is_completed = true) as completed,
         COUNT(*) FILTER (WHERE is_completed = false) as pending,
         COUNT(*) FILTER (WHERE priority = 'High') as high_priority,
         COUNT(*) FILTER (WHERE priority = 'Medium') as medium_priority,
         COUNT(*) FILTER (WHERE priority = 'Low') as low_priority
       FROM tasks WHERE user_id = $1`,
            [req.userId]
        );

        const stats = result.rows[0];
        const total = parseInt(stats.total, 10) || 0;
        const completed = parseInt(stats.completed, 10) || 0;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        res.json({
            success: true,
            data: {
                total,
                completed,
                pending: parseInt(stats.pending, 10) || 0,
                completionRate: Math.round(completionRate),
                byPriority: {
                    Haute: parseInt(stats.high_priority, 10) || 0,
                    Moyenne: parseInt(stats.medium_priority, 10) || 0,
                    Basse: parseInt(stats.low_priority, 10) || 0,
                },
            },
        });
    } catch (error) {
        console.error('Get task statistics error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;