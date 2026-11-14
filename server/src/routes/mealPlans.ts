import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { toNullIfEmpty } from '../lib/normalize';
import { MEAL_TYPES } from '@famhub/shared';

const router = Router();
router.use(authMiddleware);

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidMealType = (value: string) => (MEAL_TYPES as readonly string[]).includes(value);

// Get meal plans for a date range
router.get('/', async (req: AuthRequest, res) => {
    try {
        const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };

        let queryText = 'SELECT * FROM meal_plans WHERE user_id = $1';
        const params: any[] = [req.userId];

        if (start_date) {
            params.push(start_date);
            queryText += ` AND date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            queryText += ` AND date <= $${params.length}`;
        }

        queryText += ' ORDER BY date ASC, meal_type ASC';

        const result = await query(queryText, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get meal plans error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Create or update a meal plan by its unique (date, meal_type) slot
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { date, meal_type, custom_meal, notes } = req.body;

        if (typeof date !== 'string' || !isValidDate(date)) {
            return res.status(400).json({ success: false, error: 'Invalid date (use YYYY-MM-DD)' });
        }
        if (typeof meal_type !== 'string' || !isValidMealType(meal_type)) {
            return res.status(400).json({ success: false, error: 'Invalid meal_type' });
        }

        const result = await query(
            `INSERT INTO meal_plans (user_id, date, meal_type, custom_meal, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, date, meal_type)
             DO UPDATE SET custom_meal = EXCLUDED.custom_meal, notes = EXCLUDED.notes, updated_at = NOW()
             RETURNING *`,
            [req.userId, date, meal_type, toNullIfEmpty(custom_meal), toNullIfEmpty(notes)]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create meal plan error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Update a meal plan by id
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { date, meal_type, custom_meal, notes } = req.body;

        const updates: string[] = [];
        const values: any[] = [];
        const pushUpdate = (field: string, value: any) => {
            values.push(value);
            updates.push(`${field} = $${values.length}`);
        };

        if (date !== undefined) {
            if (typeof date !== 'string' || !isValidDate(date)) {
                return res.status(400).json({ success: false, error: 'Invalid date (use YYYY-MM-DD)' });
            }
            pushUpdate('date', date);
        }
        if (meal_type !== undefined) {
            if (typeof meal_type !== 'string' || !isValidMealType(meal_type)) {
                return res.status(400).json({ success: false, error: 'Invalid meal_type' });
            }
            pushUpdate('meal_type', meal_type);
        }
        if (custom_meal !== undefined) pushUpdate('custom_meal', toNullIfEmpty(custom_meal));
        if (notes !== undefined) pushUpdate('notes', toNullIfEmpty(notes));

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        updates.push('updated_at = NOW()');

        const result = await query(
            `UPDATE meal_plans SET ${updates.join(', ')} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`,
            [...values, id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Meal plan not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update meal plan error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete a meal plan
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Meal plan not found' });
        }

        res.json({ success: true, message: 'Meal plan deleted' });
    } catch (error) {
        console.error('Delete meal plan error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;