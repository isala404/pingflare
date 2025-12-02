import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getActiveMonitors, insertCheck } from '$lib/server/db/monitors';
import { runCheck } from '$lib/server/checkers';

export const GET: RequestHandler = async ({ platform }) => {
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

	return json({
		message: 'Checks completed',
		checked: monitors.length,
		successful,
		failed,
		results: checkResults
	});
};
