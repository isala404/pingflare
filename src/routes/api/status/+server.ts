import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllMonitors, getLastCheck, getUptime24h } from '$lib/server/db/monitors';
import type { StatusResponse } from '$lib/types/monitor';

// KV caching disabled to stay within free tier limits
// D1 queries are fast enough for small-scale monitoring

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const monitors = await getAllMonitors(db);
	const statuses: StatusResponse[] = await Promise.all(
		monitors.map(async (monitor) => {
			const lastCheck = await getLastCheck(db, monitor.id);
			const uptime24h = await getUptime24h(db, monitor.id);

			return {
				monitor_id: monitor.id,
				status: lastCheck?.status ?? 'down',
				response_time_ms: lastCheck?.response_time_ms ?? null,
				checked_at: lastCheck?.checked_at ?? new Date().toISOString(),
				uptime_24h: uptime24h
			};
		})
	);

	return json({
		source: 'database',
		statuses
	});
};
