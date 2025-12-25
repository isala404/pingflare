/* eslint-disable no-undef */
self.addEventListener('push', (event) => {
	if (!event.data) {
		return;
	}

	let data;
	try {
		data = event.data.json();
	} catch {
		data = {
			title: 'Pingflare Alert',
			body: event.data.text()
		};
	}

	const title = data.title || 'Pingflare Alert';
	const options = {
		body: data.body || '',
		icon: data.icon || '/favicon.png',
		badge: data.badge || '/favicon.png',
		data: data.data || {},
		tag: data.tag || 'pingflare-notification',
		requireInteraction: true,
		vibrate: [200, 100, 200]
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || '/';

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					client.navigate(urlToOpen);
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow(urlToOpen);
			}
		})
	);
});

self.addEventListener('notificationclose', (event) => {
	console.log('Notification closed:', event.notification.tag);
});
