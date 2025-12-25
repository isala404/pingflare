import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicGroupsWithStatus } from '$lib/server/db/groups';
import { getOverallStatus } from '$lib/types/status';
import type { StatusMonitor } from '$lib/types/status';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const groups = await getPublicGroupsWithStatus(platform.env.DB);

	// Flatten monitors from all public groups
	const monitors: StatusMonitor[] = groups.flatMap((g) => g.monitors);
	const overallStatus = getOverallStatus(monitors);

	return json({
		overall_status: overallStatus,
		groups,
		monitors
	});
};
