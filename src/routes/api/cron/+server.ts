import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActiveMonitors, insertCheck, getUptime24h } from '$lib/server/db/monitors';
import { runCheck } from '$lib/server/checkers';
import { updateMonitorStatus, updateAllStatus } from '$lib/server/cache';
import type { StatusCacheEntry } from '$lib/types/monitor';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;
	const kv = platform.env.STATUS_CACHE;
	const monitors = await getActiveMonitors(db);

	if (monitors.length === 0) {
		return json({ message: 'No active monitors', checked: 0 });
	}

	const statusEntries: StatusCacheEntry[] = [];

	const results = await Promise.allSettled(
		monitors.map(async (monitor) => {
			const result = await runCheck(monitor);
			await insertCheck(
				db,
				monitor.id,
				result.status,
				result.responseTimeMs,
				result.statusCode,
				result.errorMessage,
				null // checked_from - could add colo info later
			);

			// Update KV cache for this monitor
			const uptime24h = await getUptime24h(db, monitor.id);

			if (kv) {
				await updateMonitorStatus(kv, monitor.id, result.status, result.responseTimeMs, uptime24h);
			}

			statusEntries.push({
				monitor_id: monitor.id,
				status: result.status,
				response_time_ms: result.responseTimeMs,
				checked_at: new Date().toISOString(),
				uptime_24h: uptime24h
			});

			return {
				monitorId: monitor.id,
				name: monitor.name,
				...result
			};
		})
	);

	// Update aggregated status cache
	if (kv && statusEntries.length > 0) {
		await updateAllStatus(kv, statusEntries);
	}

	const successful = results.filter((r) => r.status === 'fulfilled').length;
	const failed = results.filter((r) => r.status === 'rejected').length;

	const checkResults = results.map((r) => {
		if (r.status === 'fulfilled') {
			return r.value;
		}
		return { error: r.reason?.message || 'Unknown error' };
	});

	return json({
		message: 'Checks completed',
		checked: monitors.length,
		successful,
		failed,
		results: checkResults
	});
};
