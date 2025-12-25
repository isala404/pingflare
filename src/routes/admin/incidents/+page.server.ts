import type { PageServerLoad } from './$types';
import { getAllIncidents } from '$lib/server/db/status';
import { getAllGroups } from '$lib/server/db/groups';
import type { Incident } from '$lib/types/status';
import type { MonitorGroup } from '$lib/types/group';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!platform?.env?.DB) {
		return {
			incidents: [] as Incident[],
			groups: [] as MonitorGroup[],
			user: locals.user
		};
	}

	const [incidents, groups] = await Promise.all([
		getAllIncidents(platform.env.DB),
		getAllGroups(platform.env.DB)
	]);

	return {
		incidents,
		groups,
		user: locals.user
	};
};
