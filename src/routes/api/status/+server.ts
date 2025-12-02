import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllStatus } from '$lib/server/cache';
import { getAllMonitors, getLastCheck, getUptime24h } from '$lib/server/db/monitors';
import type { StatusCacheEntry } from '$lib/types/monitor';

export const GET: RequestHandler = async ({ platform }) => {
	const kv = platform?.env?.STATUS_CACHE;
	const db = platform?.env?.DB;

	// Try to get from KV cache first (fast path)
	if (kv) {
		const cached = await getAllStatus(kv);
		if (cached) {
			return json({
				source: 'cache',
				statuses: cached
			});
		}
	}

	// Fallback to database (slow path)
	if (!db) {
		return json({ error: 'No data source available' }, { status: 500 });
	}

	const monitors = await getAllMonitors(db);
	const statuses: StatusCacheEntry[] = await Promise.all(
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
