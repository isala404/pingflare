import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateUserName, getUserById, userToPublic } from '$lib/server/db/auth';

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const db = platform.env.DB;

	let input: { name: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name || input.name.length < 2) {
		return json({ error: 'Name must be at least 2 characters' }, { status: 400 });
	}

	try {
		await updateUserName(db, locals.user.id, input.name);
		const user = await getUserById(db, locals.user.id);

		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		return json({ success: true, user: userToPublic(user) });
	} catch (err) {
		console.error('Profile update error:', err);
		return json({ error: 'Failed to update profile' }, { status: 500 });
	}
};
