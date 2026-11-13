import { Router } from "express";
import { query } from "../db";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { REMINDER_OPTIONS } from "@famhub/shared";

const router = Router();
router.use(authMiddleware);

const COLUMNS = `id, title, description, location, start_time, end_time, member_id, color, reminder_minutes`;

const parseBody = (body: any) => {
  const {
    title,
    description = null,
    location = null,
    start_time,
    end_time,
    member_id = null,
    color = "#3b82f6",
    reminder_minutes = null,
  } = body;

  if (typeof title !== "string" || !title.trim()) return { error: "title is required" };

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { error: "end_time must be after start_time" };
  }

  if (reminder_minutes !== null && !REMINDER_OPTIONS.includes(reminder_minutes)) {
    return { error: "invalid reminder" };
  }

  return {
    value: {
      title: title.trim(),
      description,
      location,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      member_id,
      color,
      reminder_minutes,
    },
  };
};

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) return res.status(400).json({ error: "from and to are required" });
    const { rows } = await query(
      `SELECT ${COLUMNS} FROM appointments
       WHERE user_id = $1 AND start_time >= $2::date AND start_time < ($3::date + 1)
       ORDER BY start_time`,
      [req.userId, from, to]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const parsed = parseBody(req.body);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const { rows } = await query(
      `INSERT INTO appointments
         (user_id, title, description, location, start_time, end_time, member_id, color, reminder_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLUMNS}`,
      [req.userId, v.title, v.description, v.location, v.start_time, v.end_time, v.member_id, v.color, v.reminder_minutes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req: AuthRequest, res, next) => {
  try {
    const parsed = parseBody(req.body);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const { rows } = await query(
      `UPDATE appointments SET
         title = $3, description = $4, location = $5, start_time = $6, end_time = $7,
         member_id = $8, color = $9, reminder_minutes = $10, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING ${COLUMNS}`,
      [req.params.id, req.userId, v.title, v.description, v.location, v.start_time, v.end_time, v.member_id, v.color, v.reminder_minutes]
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM appointments WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;