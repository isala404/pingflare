import type { PageServerLoad } from './$types';
import { getActiveIncidents } from '$lib/server/db/status';
import { getPublicGroupsWithStatus } from '$lib/server/db/groups';
import type { Incident } from '$lib/types/status';
import type { GroupWithStatus } from '$lib/types/group';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return {
			groups: [] as GroupWithStatus[],
			activeIncidents: [] as Incident[]
		};
	}

	const db = platform.env.DB;

	const [groups, activeIncidents] = await Promise.all([
		getPublicGroupsWithStatus(db),
		getActiveIncidents(db)
	]);

	return {
		groups,
		activeIncidents
	};
};
