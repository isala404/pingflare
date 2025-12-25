import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addPushSubscription, removePushSubscription } from '$lib/server/db/notifications';

interface SubscriptionRequest {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export const POST: RequestHandler = async ({ request, platform }) => {
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

	const userAgent = request.headers.get('user-agent') ?? undefined;

	try {
		await addPushSubscription(platform.env.DB, {
			endpoint: input.endpoint,
			p256dh: input.keys.p256dh,
			auth: input.keys.auth,
			userAgent
		});
		return json({ success: true });
	} catch (err) {
		console.error('Failed to save push subscription:', err);
		return json({ error: 'Failed to save subscription' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
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

	await removePushSubscription(platform.env.DB, input.endpoint);
	return json({ success: true });
};
