import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function readBody(body: any): { title: string; content: string; isPrivate: boolean } | null {
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 200) : '';
    if (!title) return null;
    const content = typeof body?.content === 'string' ? body.content.slice(0, 20000) : '';
    return { title, content, isPrivate: Boolean(body?.is_private) };
}

// Shared notes of the family + the caller's own private notes
router.get('/', async (req: AuthRequest, res) => {
    try {
        const result = await query(
            `SELECT n.id, n.title, n.content, n.is_private, n.author_id,
                    u.name AS author_name, (n.author_id = $2) AS is_mine,
                    n.created_at, n.updated_at
             FROM notes n
             LEFT JOIN users u ON u.id = n.author_id
             WHERE n.user_id = $1 AND (n.is_private = FALSE OR n.author_id = $2)
             ORDER BY n.updated_at DESC`,
            [req.userId, req.actualUserId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    try {
        const body = readBody(req.body);
        if (!body) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }
        const result = await query(
            `INSERT INTO notes (user_id, author_id, title, content, is_private)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [req.userId, req.actualUserId, body.title, body.content, body.isPrivate]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Only the author can edit
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const body = readBody(req.body);
        if (!body) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }
        const result = await query(
            `UPDATE notes SET title = $1, content = $2, is_private = $3, updated_at = NOW()
             WHERE id = $4 AND user_id = $5 AND author_id = $6 RETURNING id`,
            [body.title, body.content, body.isPrivate, req.params.id, req.userId, req.actualUserId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Only the author can delete
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 AND author_id = $3 RETURNING id',
            [req.params.id, req.userId, req.actualUserId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;