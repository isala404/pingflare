import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAppSetup } from '$lib/server/db/auth';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const setupComplete = await isAppSetup(platform.env.DB);

	return json({
		isSetup: setupComplete,
		user: locals.user
	});
};
