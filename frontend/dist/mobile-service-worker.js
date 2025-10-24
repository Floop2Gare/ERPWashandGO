const TIMER_NOTIFICATION_TAG_PREFIX = 'washandgo-mobile-service';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const buildNotificationTag = (engagementId) => `${TIMER_NOTIFICATION_TAG_PREFIX}-${engagementId}`;

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => {
    try {
      client.postMessage(message);
    } catch (error) {
      console.warn('[Wash&Go] Impossible d\'envoyer un message au client', error);
    }
  });
};

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') {
    return;
  }

  const { type, payload } = data;

  if (type === 'timer-notification-show') {
    if (!payload || !payload.engagementId) {
      return;
    }

    const {
      engagementId,
      title,
      body,
      running,
      timestamp,
      badge,
      icon,
    } = payload;

    const actions = [];

    if (running) {
      actions.push({ action: 'pause', title: 'Pause' });
    } else {
      actions.push({ action: 'resume', title: 'Reprendre' });
    }

    actions.push({ action: 'stop', title: 'Arrêter' });

    const tag = buildNotificationTag(engagementId);

    event.waitUntil(
      self.registration.showNotification(title || 'Prestation en cours', {
        body: body || '',
        tag,
        renotify: true,
        requireInteraction: true,
        data: { engagementId, running },
        silent: false,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        badge: badge || undefined,
        icon: icon || undefined,
        actions,
        vibrate: [150, 80, 120],
      })
    );
  } else if (type === 'timer-notification-close') {
    if (!payload || !payload.engagementId) {
      return;
    }
    const tag = buildNotificationTag(payload.engagementId);
    event.waitUntil(
      (async () => {
        const notifications = await self.registration.getNotifications({ tag, includeTriggered: true });
        notifications.forEach((notification) => notification.close());
      })()
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const data = notification?.data || {};
  const engagementId = data.engagementId;

  const focusClient = async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (allClients.length > 0) {
      const focused = allClients.find((client) => 'focus' in client);
      if (focused && 'focus' in focused) {
        await focused.focus();
        return focused;
      }
      return allClients[0];
    }
    return self.clients.openWindow('/?ui=mobile');
  };

  if (action === 'pause' || action === 'resume' || action === 'stop') {
    event.waitUntil(
      (async () => {
        await focusClient();
        await broadcastToClients({
          type: 'timer-notification-action',
          payload: { engagementId, action },
        });
      })()
    );
  } else {
    event.waitUntil(focusClient());
  }

  notification.close();
});

self.addEventListener('notificationclose', (event) => {
  const data = event.notification?.data;
  if (!data || !data.engagementId) {
    return;
  }
  event.waitUntil(
    broadcastToClients({
      type: 'timer-notification-closed',
      payload: { engagementId: data.engagementId },
    })
  );
});
