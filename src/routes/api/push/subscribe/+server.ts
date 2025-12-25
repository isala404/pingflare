import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	addPushSubscription,
	removePushSubscription,
	getPushSubscriptionByEndpoint,
	createNotificationChannel,
	getAllNotificationChannels,
	deleteNotificationChannel
} from '$lib/server/db/notifications';

interface SubscriptionRequest {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
	name?: string;
}

function getBrowserName(userAgent: string | null): string {
	if (!userAgent) return 'Browser';
	if (userAgent.includes('Firefox')) return 'Firefox';
	if (userAgent.includes('Edg')) return 'Edge';
	if (userAgent.includes('Chrome')) return 'Chrome';
	if (userAgent.includes('Safari')) return 'Safari';
	return 'Browser';
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: SubscriptionRequest;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.endpoint) {
		return json({ error: 'Endpoint is required' }, { status: 400 });
	}

	if (!input.keys?.p256dh || !input.keys?.auth) {
		return json({ error: 'Keys (p256dh and auth) are required' }, { status: 400 });
	}

	const userAgent = request.headers.get('user-agent') ?? null;
	const browserName = getBrowserName(userAgent);

	try {
		// Check if subscription already exists
		const existing = await getPushSubscriptionByEndpoint(platform.env.DB, input.endpoint);

		// Add/update the push subscription
		const subscription = await addPushSubscription(platform.env.DB, {
			endpoint: input.endpoint,
			p256dh: input.keys.p256dh,
			auth: input.keys.auth,
			userAgent: userAgent ?? undefined
		});

		// If this is a new subscription, create a notification channel for it
		if (!existing) {
			const channelName = input.name || `${browserName} Push`;
			await createNotificationChannel(platform.env.DB, {
				type: 'webpush',
				name: channelName,
				config: { subscriptionId: subscription.id },
				active: true
			});
		}

		return json({ success: true, subscriptionId: subscription.id });
	} catch (err) {
		console.error('Failed to save push subscription:', err);
		return json({ error: 'Failed to save subscription' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: { endpoint: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.endpoint) {
		return json({ error: 'Endpoint is required' }, { status: 400 });
	}

	// Get the subscription to find its ID
	const subscription = await getPushSubscriptionByEndpoint(platform.env.DB, input.endpoint);

	if (subscription) {
		// Find and delete the associated notification channel
		const channels = await getAllNotificationChannels(platform.env.DB);
		for (const channel of channels) {
			if (channel.type === 'webpush') {
				try {
					const config = JSON.parse(channel.config);
					if (config.subscriptionId === subscription.id) {
						await deleteNotificationChannel(platform.env.DB, channel.id);
						break;
					}
				} catch {
					// Ignore parse errors
				}
			}
		}
	}

	await removePushSubscription(platform.env.DB, input.endpoint);
	return json({ success: true });
};
