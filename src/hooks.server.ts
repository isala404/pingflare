import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSession, getUserById, isAppSetup, userToPublic } from '$lib/server/db/auth';

const PUBLIC_PATHS = [
	'/login',
	'/setup',
	'/status',
	'/api/auth/login',
	'/api/auth/setup',
	'/api/auth/status',
	'/api/cron',
	'/api/status',
	'/api/public'
];

export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, url, platform } = event;

	// Initialize locals
	event.locals.user = null;
	event.locals.sessionId = null;

	// Skip auth for public paths
	const isPublicPath = PUBLIC_PATHS.some(
		(path) => url.pathname === path || url.pathname.startsWith(path + '/')
	);

	if (!platform?.env?.DB) {
		// No database available, allow request to proceed
		return resolve(event);
	}

	const db = platform.env.DB;

	// Check if app is setup
	const setupComplete = await isAppSetup(db);

	// If not setup and not on setup page, redirect to setup
	if (!setupComplete && url.pathname !== '/setup' && !url.pathname.startsWith('/api/auth/')) {
		throw redirect(302, '/setup');
	}

	// If setup complete and on setup page, redirect to login
	if (setupComplete && url.pathname === '/setup') {
		throw redirect(302, '/login');
	}

	// Check session cookie
	const sessionId = cookies.get('session');

	if (sessionId) {
		const session = await getSession(db, sessionId);

		if (session) {
			const user = await getUserById(db, session.user_id);

			if (user) {
				event.locals.user = userToPublic(user);
				event.locals.sessionId = sessionId;
			}
		}
	}

	// If authenticated and on login page, redirect to dashboard
	if (event.locals.user && url.pathname === '/login') {
		throw redirect(302, '/');
	}

	// If not authenticated and not on public path, redirect to login
	if (!event.locals.user && !isPublicPath && setupComplete) {
		throw redirect(302, '/login');
	}

	return resolve(event);
};
