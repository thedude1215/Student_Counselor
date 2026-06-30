import admin from 'firebase-admin';
import { supabase } from '../lib/supabase.js';

let _messaging = null;

function getMessaging() {
  if (_messaging) return _messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[notifications] FIREBASE_SERVICE_ACCOUNT_JSON not set — push disabled');
    return null;
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }

  _messaging = admin.messaging();
  return _messaging;
}

/**
 * Send a push notification to all registered devices for a user.
 * Silently removes expired/invalid tokens from the DB.
 */
export async function sendToUser(profileId, { title, body, url = '/dashboard/tasks', taskId }) {
  const messaging = getMessaging();
  if (!messaging) return;

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('fcm_token')
    .eq('profile_id', profileId);

  if (!subs?.length) return;

  const tokens = subs.map(s => s.fcm_token);

  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url, ...(taskId ? { taskId } : {}) },
    webpush: {
      notification: {
        icon: 'https://scholarpath.app/scholarpath-logo.svg',
        badge: 'https://scholarpath.app/scholarpath-logo.svg',
        requireInteraction: false,
      },
      fcmOptions: { link: url },
    },
  });

  // Clean up expired or invalid tokens
  const expired = [];
  result.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        expired.push(tokens[idx]);
      }
    }
  });

  if (expired.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', profileId)
      .in('fcm_token', expired);
  }
}

/**
 * Build and send a deadline-type notification for a specific task.
 */
export async function sendDeadlineReminder(task, type) {
  const uni = task.universities?.short_name || task.universities?.name || null;
  const subject = uni ? `${uni} — ${task.title}` : task.title;

  const payloads = {
    '7day': { title: '📅 Deadline in 7 days', body: `${subject} is due in 7 days` },
    '24hr': { title: '⏰ Due tomorrow',        body: `${subject} is due tomorrow` },
    overdue:{ title: '🔴 Overdue task',        body: `${subject} is past due` },
  };

  const { title, body } = payloads[type] || payloads['7day'];
  await sendToUser(task.profile_id, { title, body, taskId: task.id, url: '/dashboard/tasks' });
}
