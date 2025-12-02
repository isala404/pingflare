import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/db/auth';

export const POST: RequestHandler = async ({ cookies, locals, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const sessionId = locals.sessionId;

	if (sessionId) {
		await deleteSession(platform.env.DB, sessionId);
	}

	cookies.delete('session', { path: '/' });

	return json({ success: true });
};
