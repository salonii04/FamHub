import { Router } from 'express';
import { query } from '../db';
import { authMiddleware, requireParent, AuthRequest } from '../middleware/auth';
import { parseStringArray, serializeStringArray, toNullIfEmpty } from '../lib/normalize';

const router = Router();
router.use(authMiddleware);

const DEFAULT_ROLE = 'Other';
const DEFAULT_COLOR = '#3B82F6';

const isValidHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);
const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const mapMember = (row: any) => ({
    id: row.id,
    name: row.name,
    role: row.role || DEFAULT_ROLE,
    color: row.color || DEFAULT_COLOR,
    birthdate: row.birth_date || null,
    allergies: parseStringArray(row.allergies),
    medications: parseStringArray(row.medications),
    emergency_contact_name: row.emergency_contact_name ?? null,
    emergency_contact_phone: row.emergency_contact_phone ?? null,
    notes: row.notes ?? null,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

// List all members of the family
router.get('/', async (req: AuthRequest, res) => {
    try {
        const result = await query(
            'SELECT * FROM family_members WHERE user_id = $1 ORDER BY name ASC',
            [req.userId]
        );
        res.json({ success: true, data: result.rows.map(mapMember) });
    } catch (error) {
        console.error('Get family members error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get one member
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }

        const result = await query(
            'SELECT * FROM family_members WHERE id = $1 AND user_id = $2',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }

        res.json({ success: true, data: mapMember(result.rows[0]) });
    } catch (error) {
        console.error('Get family member error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Create a member (parents only: members can hold medical details)
router.post('/', requireParent, async (req: AuthRequest, res) => {
    try {
        const body = req.body ?? {};

        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 255) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }

        const color = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : DEFAULT_COLOR;
        if (!isValidHexColor(color)) {
            return res.status(400).json({ success: false, error: 'Invalid color format' });
        }

        const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim().slice(0, 50) : DEFAULT_ROLE;

        const birthdate = toNullIfEmpty(body.birthdate);
        if (birthdate !== null && (typeof birthdate !== 'string' || !isValidDate(birthdate))) {
            return res.status(400).json({ success: false, error: 'Invalid birthdate (use YYYY-MM-DD)' });
        }

        const result = await query(
            `INSERT INTO family_members
                (user_id, name, role, birth_date, color, allergies, medications,
                 emergency_contact_name, emergency_contact_phone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                req.userId,
                name,
                role,
                birthdate,
                color,
                serializeStringArray(body.allergies),
                serializeStringArray(body.medications),
                toNullIfEmpty(body.emergency_contact_name),
                toNullIfEmpty(body.emergency_contact_phone),
                toNullIfEmpty(body.notes),
            ]
        );

        res.json({ success: true, data: mapMember(result.rows[0]) });
    } catch (error) {
        console.error('Create family member error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Update a member (parents only)
router.put('/:id', requireParent, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }
        const body = req.body ?? {};

        const updates: string[] = [];
        const values: any[] = [];
        const set = (column: string, value: any) => {
            values.push(value);
            updates.push(`${column} = $${values.length}`);
        };

        if (body.name !== undefined) {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            if (!name || name.length > 255) {
                return res.status(400).json({ success: false, error: 'Name cannot be empty' });
            }
            set('name', name);
        }
        if (body.role !== undefined) {
            set('role', typeof body.role === 'string' && body.role.trim() ? body.role.trim().slice(0, 50) : DEFAULT_ROLE);
        }
        if (body.color !== undefined) {
            const color = typeof body.color === 'string' ? body.color.trim() : '';
            if (!isValidHexColor(color)) {
                return res.status(400).json({ success: false, error: 'Invalid color format' });
            }
            set('color', color);
        }
        if (body.birthdate !== undefined) {
            const birthdate = toNullIfEmpty(body.birthdate);
            if (birthdate !== null && (typeof birthdate !== 'string' || !isValidDate(birthdate))) {
                return res.status(400).json({ success: false, error: 'Invalid birthdate (use YYYY-MM-DD)' });
            }
            set('birth_date', birthdate);
        }
        if (body.allergies !== undefined) set('allergies', serializeStringArray(body.allergies));
        if (body.medications !== undefined) set('medications', serializeStringArray(body.medications));
        if (body.emergency_contact_name !== undefined) set('emergency_contact_name', toNullIfEmpty(body.emergency_contact_name));
        if (body.emergency_contact_phone !== undefined) set('emergency_contact_phone', toNullIfEmpty(body.emergency_contact_phone));
        if (body.notes !== undefined) set('notes', toNullIfEmpty(body.notes));

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }
        updates.push('updated_at = NOW()');

        const result = await query(
            `UPDATE family_members SET ${updates.join(', ')}
             WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`,
            [...values, id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }

        res.json({ success: true, data: mapMember(result.rows[0]) });
    } catch (error) {
        console.error('Update family member error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Delete a member (parents only)
router.delete('/:id', requireParent, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        if (!isUuid(id)) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }

        const result = await query(
            'DELETE FROM family_members WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Family member not found' });
        }

        res.json({ success: true, message: 'Family member deleted' });
    } catch (error) {
        console.error('Delete family member error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;