import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getNotificationChannelById,
	getPushSubscriptions,
	getVapidKeys
} from '$lib/server/db/notifications';
import { sendTestNotification } from '$lib/server/notifications';

export const POST: RequestHandler = async ({ params, platform, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const channel = await getNotificationChannelById(platform.env.DB, params.id);
	if (!channel) {
		return json({ error: 'Notification channel not found' }, { status: 404 });
	}

	// For webpush, add diagnostic info
	if (channel.type === 'webpush') {
		const subscriptions = await getPushSubscriptions(platform.env.DB);
		const vapidKeys = await getVapidKeys(platform.env.DB);

		if (!vapidKeys) {
			return json({ error: 'VAPID keys not configured' }, { status: 500 });
		}

		if (subscriptions.length === 0) {
			return json(
				{ error: 'No push subscriptions found. Enable notifications on the dashboard first.' },
				{ status: 400 }
			);
		}

		console.log(`Sending test push to ${subscriptions.length} subscription(s)`);
	}

	const applicationServerUrl = `mailto:admin@${url.hostname}`;
	const result = await sendTestNotification(platform.env.DB, channel, applicationServerUrl);

	if (!result.success) {
		return json({ error: result.error ?? 'Failed to send test notification' }, { status: 500 });
	}

	return json({ success: true, message: 'Test notification sent' });
};
