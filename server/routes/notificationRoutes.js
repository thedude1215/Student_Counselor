import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import { sendToUser } from '../services/notificationService.js';

const router = Router();

// POST /api/notifications/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ profile_id: req.userId, fcm_token: token }, { onConflict: 'profile_id,fcm_token' });

  if (error) {
    console.error('push subscribe error', error);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }

  res.json({ ok: true });
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', req.userId)
    .eq('fcm_token', token);

  if (error) {
    console.error('push unsubscribe error', error);
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }

  res.json({ ok: true });
});

// POST /api/notifications/test  — dev only, sends a test push to yourself
router.post('/test', requireAuth, async (req, res) => {
  try {
    await sendToUser(req.userId, {
      title: '🔔 ScholarPath test',
      body: 'Push notifications are working!',
      url: '/dashboard/tasks',
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
