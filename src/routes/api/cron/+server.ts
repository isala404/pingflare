import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getActiveMonitors,
	insertCheck,
	getLastCheck,
	cleanupOldChecks
} from '$lib/server/db/monitors';
import { runCheck } from '$lib/server/checkers';
import { sendNotifications } from '$lib/server/notifications';
import { aggregateDailyStatus, cleanupOldDailyStatus } from '$lib/server/db/status';
import type { MonitorStatus } from '$lib/types/monitor';

// KV caching disabled to stay within free tier limits (1000 puts/day)
// D1 queries are fast enough for small-scale monitoring

export const GET: RequestHandler = async ({ platform, request }) => {
	// Validate cron secret - must match CRON_SECRET environment variable
	const cronSecret = platform?.env?.CRON_SECRET;
	const providedSecret = request.headers.get('X-Cron-Secret');

	if (!cronSecret || providedSecret !== cronSecret) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;
	const monitors = await getActiveMonitors(db);

	if (monitors.length === 0) {
		return json({ message: 'No active monitors', checked: 0 });
	}

	const results = await Promise.allSettled(
		monitors.map(async (monitor) => {
			const lastCheck = await getLastCheck(db, monitor.id);
			const previousStatus: MonitorStatus | null = lastCheck?.status ?? null;

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

			// Send notifications on status change
			if (previousStatus !== result.status) {
				try {
					await sendNotifications(
						db,
						monitor,
						previousStatus,
						result.status,
						null, // incident tracking to be implemented
						'mailto:admin@pingflare.app'
					);
				} catch (err) {
					console.error(`Failed to send notifications for ${monitor.name}:`, err);
				}
			}

			return {
				monitorId: monitor.id,
				name: monitor.name,
				...result
			};
		})
	);

	const successful = results.filter((r) => r.status === 'fulfilled').length;
	const failed = results.filter((r) => r.status === 'rejected').length;

	const checkResults = results.map((r) => {
		if (r.status === 'fulfilled') {
			return r.value;
		}
		return { error: r.reason?.message || 'Unknown error' };
	});

	// Run daily aggregation and cleanup at midnight (hour 0, minute 0-5)
	const now = new Date();
	if (now.getHours() === 0 && now.getMinutes() <= 5) {
		try {
			await aggregateDailyStatus(db);
			// Clean up old raw checks (keep 7 days) and old daily status (keep 365 days)
			await cleanupOldChecks(db, 7);
			await cleanupOldDailyStatus(db, 365);
		} catch (err) {
			console.error('Failed to run aggregation/cleanup:', err);
		}
	}

	return json({
		message: 'Checks completed',
		checked: monitors.length,
		successful,
		failed,
		results: checkResults
	});
};
