import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateCredentials, createSession, userToPublic } from '$lib/server/db/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	let input: { username: string; password: string };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.username || !input.password) {
		return json({ error: 'Username and password are required' }, { status: 400 });
	}

	try {
		const user = await validateCredentials(db, input.username, input.password);

		if (!user) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

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

		return json({ success: true, user: userToPublic(user) });
	} catch (err) {
		console.error('Login error:', err);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
