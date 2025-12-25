import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMonitorNotifications } from '$lib/server/db/notifications';

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const notifications = await getMonitorNotifications(platform.env.DB, params.id);
	return json(notifications);
};
