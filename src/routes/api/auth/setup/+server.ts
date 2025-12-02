import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	isAppSetup,
	markAppSetup,
	createUser,
	createSession,
	getUserCount
} from '$lib/server/db/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	// Check if already setup
	const setupComplete = await isAppSetup(db);
	if (setupComplete) {
		return json({ error: 'Application is already set up' }, { status: 400 });
	}

	// Double check no users exist
	const userCount = await getUserCount(db);
	if (userCount > 0) {
		await markAppSetup(db);
		return json({ error: 'Application is already set up' }, { status: 400 });
	}

	let input: { name: string; email: string; password: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name || !input.email || !input.password) {
		return json({ error: 'Name, email and password are required' }, { status: 400 });
	}

	if (input.name.length < 2) {
		return json({ error: 'Name must be at least 2 characters' }, { status: 400 });
	}

	if (!input.email.includes('@')) {
		return json({ error: 'Please enter a valid email address' }, { status: 400 });
	}

	if (input.password.length < 8) {
		return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	try {
		// Create admin user
		const user = await createUser(db, {
			name: input.name,
			email: input.email,
			password: input.password,
			role: 'admin'
		});

		// Mark setup complete
		await markAppSetup(db);

		// Create session
		const session = await createSession(db, user.id);

		// Set cookie
		cookies.set('session', session.id, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ success: true, user });
	} catch (err) {
		console.error('Setup error:', err);
		return json({ error: 'Failed to create admin user' }, { status: 500 });
	}
};
