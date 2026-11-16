import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireParent, AuthRequest } from '../middleware/auth';
import { toNullIfEmpty } from '../lib/normalize';

const router = Router();
router.use(authMiddleware);

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function monthStart(raw: unknown): string | null {
    const month = typeof raw === 'string' ? raw : new Date().toISOString().slice(0, 7);
    return MONTH_RE.test(month) ? `${month}-01` : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// List transactions for a month (any family member can read)
router.get('/transactions', async (req: AuthRequest, res) => {
    try {
        const start = monthStart(req.query.month);
        if (!start) {
            return res.status(400).json({ success: false, error: 'Invalid month (use YYYY-MM)' });
        }
        const result = await query(
            `SELECT id, type, amount, category, description, date, created_at
             FROM budget_transactions
             WHERE user_id = $1 AND date >= $2::date AND date < ($2::date + INTERVAL '1 month')
             ORDER BY date DESC, created_at DESC`,
            [req.userId, start]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get budget transactions error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Add a transaction (parents only)
router.post('/transactions', requireParent, async (req: AuthRequest, res) => {
    try {
        const { type, amount, category, description, date } = req.body;

        if (type !== 'expense' && type !== 'income') {
            return res.status(400).json({ success: false, error: 'Type must be expense or income' });
        }
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > 9999999999) {
            return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
        }
        const cleanedCategory =
            typeof category === 'string' && category.trim() ? category.trim().slice(0, 50) : 'Other';
        const cleanedDate = toNullIfEmpty(date);
        if (cleanedDate !== null && cleanedDate !== undefined && !DATE_RE.test(String(cleanedDate))) {
            return res.status(400).json({ success: false, error: 'Date must be YYYY-MM-DD' });
        }

        const result = await query(
            `INSERT INTO budget_transactions (user_id, created_by, type, amount, category, description, date)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE))
             RETURNING id, type, amount, category, description, date, created_at`,
            [req.userId, req.actualUserId, type, value, cleanedCategory, toNullIfEmpty(description), cleanedDate ?? null]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create budget transaction error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete a transaction (parents only)
router.delete('/transactions/:id', requireParent, async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'DELETE FROM budget_transactions WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        res.json({ success: true, message: 'Transaction deleted' });
    } catch (error) {
        console.error('Delete budget transaction error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Monthly summary: totals plus spending vs limit per category
router.get('/summary', async (req: AuthRequest, res) => {
    try {
        const start = monthStart(req.query.month);
        if (!start) {
            return res.status(400).json({ success: false, error: 'Invalid month (use YYYY-MM)' });
        }

        const totals = await query(
            `SELECT type, category, SUM(amount) AS total
             FROM budget_transactions
             WHERE user_id = $1 AND date >= $2::date AND date < ($2::date + INTERVAL '1 month')
             GROUP BY type, category`,
            [req.userId, start]
        );
        const limits = await query(
            'SELECT category, monthly_limit FROM budget_limits WHERE user_id = $1',
            [req.userId]
        );

        let income = 0;
        let expenses = 0;
        const spentByCategory = new Map<string, number>();
        for (const row of totals.rows) {
            const total = Number(row.total) || 0;
            if (row.type === 'income') {
                income += total;
            } else {
                expenses += total;
                spentByCategory.set(row.category, (spentByCategory.get(row.category) ?? 0) + total);
            }
        }

        const limitByCategory = new Map<string, number>();
        for (const row of limits.rows) {
            limitByCategory.set(row.category, Number(row.monthly_limit));
        }

        const categories = new Set([...spentByCategory.keys(), ...limitByCategory.keys()]);
        const byCategory = [...categories]
            .map((category) => ({
                category,
                spent: round2(spentByCategory.get(category) ?? 0),
                limit: limitByCategory.get(category) ?? null,
            }))
            .sort((a, b) => b.spent - a.spent);

        res.json({
            success: true,
            data: {
                month: start.slice(0, 7),
                income: round2(income),
                expenses: round2(expenses),
                balance: round2(income - expenses),
                byCategory,
            },
        });
    } catch (error) {
        console.error('Get budget summary error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Set or update a monthly limit for a category (parents only)
router.put('/limits', requireParent, async (req: AuthRequest, res) => {
    try {
        const { category, monthly_limit } = req.body;
        const cleanedCategory = typeof category === 'string' ? category.trim().slice(0, 50) : '';
        const value = Number(monthly_limit);
        if (!cleanedCategory) {
            return res.status(400).json({ success: false, error: 'Category is required' });
        }
        if (!Number.isFinite(value) || value <= 0 || value > 9999999999) {
            return res.status(400).json({ success: false, error: 'Limit must be a positive number' });
        }

        const result = await query(
            `INSERT INTO budget_limits (user_id, category, monthly_limit)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, category) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
             RETURNING category, monthly_limit`,
            [req.userId, cleanedCategory, value]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Set budget limit error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Remove a category limit (parents only)
router.delete('/limits/:category', requireParent, async (req: AuthRequest, res) => {
    try {
        await query('DELETE FROM budget_limits WHERE user_id = $1 AND category = $2', [
            req.userId,
            req.params.category,
        ]);
        res.json({ success: true, message: 'Limit removed' });
    } catch (error) {
        console.error('Remove budget limit error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;