import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicMonitorsForStatusPage } from '$lib/server/db/status';
import { getOverallStatus } from '$lib/types/status';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const monitors = await getPublicMonitorsForStatusPage(platform.env.DB);
	const overallStatus = getOverallStatus(monitors);

	return json({
		overall_status: overallStatus,
		monitors
	});
};
