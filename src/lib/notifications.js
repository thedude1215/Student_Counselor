import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';

const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY   = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const API_BASE    = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const LS_TOKEN_KEY = 'sp_fcm_token';

let _messaging = null;

function getFirebaseMessaging() {
  if (_messaging) return _messaging;
  if (!FIREBASE_CONFIG.apiKey) return null; // env vars not set yet
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  _messaging = getMessaging(app);
  return _messaging;
}

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPermissionState() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function subscribeToNotifications(session) {
  if (!notificationsSupported()) throw new Error('Push not supported in this browser');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getFirebaseMessaging();
  if (!messaging) throw new Error('Firebase not configured — add VITE_FIREBASE_* env vars');

  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
  if (!token) throw new Error('Failed to get FCM token');

  await fetch(`${API_BASE}/api/notifications/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token }),
  });

  localStorage.setItem(LS_TOKEN_KEY, token);
  return token;
}

export async function unsubscribeFromNotifications(session) {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) return;

  const messaging = getFirebaseMessaging();
  if (messaging) {
    try { await deleteToken(messaging); } catch { /* already gone */ }
  }

  await fetch(`${API_BASE}/api/notifications/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ token }),
  });

  localStorage.removeItem(LS_TOKEN_KEY);
}

export function getCachedToken() {
  return localStorage.getItem(LS_TOKEN_KEY);
}

// Forward foreground messages to a callback
export function onForegroundMessage(callback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
