import { Router } from "express";
import { query } from "../db";
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { SHOPPING_CATEGORIES } from "@famhub/shared";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, quantity, unit, price, category, notes, checked, created_at
       FROM shopping_items
       WHERE user_id = $1
       ORDER BY checked ASC, category ASC, created_at ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
        console.error('Get shopping items error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, quantity = 1, unit = null, price = null, category = "Other", notes = null } = req.body;
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!SHOPPING_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }
    const { rows } = await query(
      `INSERT INTO shopping_items (user_id, name, quantity, unit, price, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, quantity, unit, price, category, notes, checked, created_at`,
      [req.userId, name.trim(), quantity, unit, price, category, notes]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
        console.error('Add shopping items error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const { name, quantity, unit, price, category, notes, checked } = req.body;
    if (category !== undefined && !SHOPPING_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }
    const { rows } = await query(
      `UPDATE shopping_items SET
         name = COALESCE($3, name),
         quantity = COALESCE($4, quantity),
         unit = COALESCE($5, unit),
         price = COALESCE($6, price),
         category = COALESCE($7, category),
         notes = COALESCE($8, notes),
         checked = COALESCE($9, checked),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, quantity, unit, price, category, notes, checked, created_at`,
      [req.params.id, req.userId, name?.trim(), quantity, unit, price, category, notes, checked]
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (error) {
        console.error('Update shopping items error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete("/checked", async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM shopping_items WHERE user_id = $1 AND checked = TRUE`, [req.userId]);
    res.status(204).end();
  } catch (error) {
        console.error('Check shopping items error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM shopping_items WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (error) {
        console.error('Delete shopping items error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;