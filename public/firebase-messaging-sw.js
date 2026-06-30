importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBBSzd0zQWavg2-TwnUt8PEXH_akvGWY8o',
  authDomain:        'schoalrpath.firebaseapp.com',
  projectId:         'schoalrpath',
  storageBucket:     'schoalrpath.firebasestorage.app',
  messagingSenderId: '498774596835',
  appId:             '1:498774596835:web:9e9b5051737698ad7139d6',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  const url = payload.data?.url || '/dashboard/tasks';

  self.registration.showNotification(title || 'ScholarPath', {
    body: body || '',
    icon: '/scholarpath-logo.svg',
    badge: '/scholarpath-logo.svg',
    tag: payload.data?.taskId || 'scholarpath-reminder',
    renotify: true,
    data: { url },
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/dashboard/tasks';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes(self.location.origin));
      if (match) { match.focus(); return match.navigate(url); }
      return clients.openWindow(url);
    })
  );
});
