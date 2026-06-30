import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendDeadlineReminder } from './notificationService.js';

function toDateStr(date) {
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

async function alreadySent(taskId, type) {
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('task_id', taskId)
    .eq('type', type)
    .maybeSingle();
  return !!data;
}

async function logSent(profileId, taskId, type) {
  await supabase
    .from('notification_log')
    .insert({ profile_id: profileId, task_id: taskId, type })
    .throwOnError();
}

async function fetchDueTasks(dueDate) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, profile_id, title, due_date, universities(name, short_name)')
    .eq('due_date', dueDate)
    .neq('status', 'done');
  if (error) console.error('[cron] fetchDueTasks error', error);
  return data || [];
}

async function fetchOverdueTasks() {
  const today = toDateStr(new Date());
  const { data, error } = await supabase
    .from('tasks')
    .select('id, profile_id, title, due_date, universities(name, short_name)')
    .lt('due_date', today)
    .neq('status', 'done');
  if (error) console.error('[cron] fetchOverdueTasks error', error);
  return data || [];
}

async function runReminders() {
  const now = new Date();
  console.log(`[cron] Running deadline reminders at ${now.toISOString()}`);

  const [tasks7, tasks24, tasksOverdue] = await Promise.all([
    fetchDueTasks(toDateStr(addDays(now, 7))),
    fetchDueTasks(toDateStr(addDays(now, 1))),
    fetchOverdueTasks(),
  ]);

  // Helper: send if not already logged
  async function maybeNotify(task, type) {
    if (await alreadySent(task.id, type)) return;
    try {
      await sendDeadlineReminder(task, type);
      await logSent(task.profile_id, task.id, type);
    } catch (err) {
      console.error(`[cron] Failed to send ${type} for task ${task.id}:`, err.message);
    }
  }

  await Promise.all([
    ...tasks7.map(t => maybeNotify(t, '7day')),
    ...tasks24.map(t => maybeNotify(t, '24hr')),
    ...tasksOverdue.map(t => maybeNotify(t, 'overdue')),
  ]);

  const total = tasks7.length + tasks24.length + tasksOverdue.length;
  console.log(`[cron] Processed ${total} tasks (7day:${tasks7.length}, 24hr:${tasks24.length}, overdue:${tasksOverdue.length})`);
}

// Run daily at 09:00 UTC
cron.schedule('0 9 * * *', runReminders, { timezone: 'UTC' });

console.log('[cron] Deadline reminder job registered (daily 09:00 UTC)');

export { runReminders }; // export for manual testing
