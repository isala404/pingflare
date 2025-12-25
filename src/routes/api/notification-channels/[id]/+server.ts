import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getNotificationChannelById,
	updateNotificationChannel,
	deleteNotificationChannel
} from '$lib/server/db/notifications';
import type { UpdateNotificationChannelInput } from '$lib/types/notification';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
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

	return json(channel);
};

export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: UpdateNotificationChannelInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const channel = await updateNotificationChannel(platform.env.DB, params.id, input);
		if (!channel) {
			return json({ error: 'Notification channel not found' }, { status: 404 });
		}
		return json(channel);
	} catch (err) {
		console.error('Failed to update notification channel:', err);
		return json({ error: 'Failed to update notification channel' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const deleted = await deleteNotificationChannel(platform.env.DB, params.id);
	if (!deleted) {
		return json({ error: 'Notification channel not found' }, { status: 404 });
	}

	return json({ success: true });
};
