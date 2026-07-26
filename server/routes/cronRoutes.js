import { Router } from 'express';
import { runReminders } from '../services/reminderCron.js';

const router = Router();

/* Vercel Cron hits this on the schedule in vercel.json. Vercel signs its own
 * cron requests with `Authorization: Bearer $CRON_SECRET` when that env var
 * is set, so checking it here also blocks anyone else from triggering a
 * reminder run (and the notification spam that would come with it). */
router.get('/reminders', async (req, res) => {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await runReminders();
    res.json({ ok: true });
  } catch (err) {
    console.error('[cron] /reminders error:', err);
    res.status(500).json({ error: 'Reminder run failed' });
  }
});

export default router;
