import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getVapidKeys, setVapidKeys } from '$lib/server/db/notifications';
import { generateVapidKeys } from '$lib/server/notifications/webpush';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let keys = await getVapidKeys(platform.env.DB);

	if (!keys) {
		keys = await generateVapidKeys();
		await setVapidKeys(platform.env.DB, keys);
	}

	return json({ publicKey: keys.publicKey });
};
