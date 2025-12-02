import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyUserPassword, updateUserPassword } from '$lib/server/db/auth';

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	if (!locals.user) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const db = platform.env.DB;

	let input: { currentPassword: string; newPassword: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.currentPassword || !input.newPassword) {
		return json({ error: 'Current and new password are required' }, { status: 400 });
	}

	if (input.newPassword.length < 8) {
		return json({ error: 'New password must be at least 8 characters' }, { status: 400 });
	}

	try {
		// Verify current password
		const isValid = await verifyUserPassword(db, locals.user.id, input.currentPassword);
		if (!isValid) {
			return json({ error: 'Current password is incorrect' }, { status: 401 });
		}

		// Update password
		await updateUserPassword(db, locals.user.id, input.newPassword);

		return json({ success: true });
	} catch (err) {
		console.error('Password update error:', err);
		return json({ error: 'Failed to update password' }, { status: 500 });
	}
};
