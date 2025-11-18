/**
 * PWA Push Notification Utilities
 * 
 * This file provides utilities for handling push notifications in the PWA.
 * To enable push notifications, you need to:
 * 1. Generate VAPID keys (use web-push library: npx web-push generate-vapid-keys)
 * 2. Store the public key in your environment
 * 3. Set up a backend endpoint to send notifications
 */

interface PushSubscriptionJSON {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (!('Notification' in window)) {
		console.warn('Notifications are not supported in this browser');
		return false;
	}

	if (Notification.permission === 'granted') {
		return true;
	}

	if (Notification.permission === 'denied') {
		console.warn('Notification permission has been denied');
		return false;
	}

	const permission = await Notification.requestPermission();
	return permission === 'granted';
}

/**
 * Subscribe to push notifications
 * @param vapidPublicKey - Your VAPID public key (generate with web-push)
 */
export async function subscribeToPushNotifications(
	vapidPublicKey: string
): Promise<PushSubscriptionJSON | null> {
	try {
		// Check if service worker is supported
		if (!('serviceWorker' in navigator)) {
			console.warn('Service workers are not supported');
			return null;
		}

		// Wait for service worker to be ready
		const registration = await navigator.serviceWorker.ready;

		// Check if push manager is available
		if (!registration.pushManager) {
			console.warn('Push manager is not available');
			return null;
		}

		// Subscribe to push notifications
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
		});

		// Convert subscription to JSON
		const subscriptionJSON = subscription.toJSON() as PushSubscriptionJSON;

		// Send subscription to your backend
		// await fetch('/api/push/subscribe', {
		//   method: 'POST',
		//   headers: { 'Content-Type': 'application/json' },
		//   body: JSON.stringify(subscriptionJSON)
		// });

		return subscriptionJSON;
	} catch (error) {
		console.error('Failed to subscribe to push notifications:', error);
		return null;
	}
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
	try {
		if (!('serviceWorker' in navigator)) {
			return false;
		}

		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();

		if (subscription) {
			await subscription.unsubscribe();

			// Notify your backend
			// await fetch('/api/push/unsubscribe', {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify({ endpoint: subscription.endpoint })
			// });

			return true;
		}

		return false;
	} catch (error) {
		console.error('Failed to unsubscribe from push notifications:', error);
		return false;
	}
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushNotificationSubscribed(): Promise<boolean> {
	try {
		if (!('serviceWorker' in navigator)) {
			return false;
		}

		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();

		return subscription !== null;
	} catch (error) {
		console.error('Failed to check push notification subscription:', error);
		return false;
	}
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
}

/**
 * Show a local notification (doesn't require push)
 * Useful for testing notification UI
 */
export async function showLocalNotification(
	title: string,
	options?: NotificationOptions
): Promise<void> {
	const hasPermission = await requestNotificationPermission();

	if (!hasPermission) {
		console.warn('Cannot show notification: permission not granted');
		return;
	}

	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.ready;
		await registration.showNotification(title, {
			icon: '/icon.svg',
			badge: '/icon.svg',
			...options
		});
	} else {
		new Notification(title, {
			icon: '/icon.svg',
			...options
		});
	}
}
