import type { PageServerLoad } from './$types';
import { getAllGroups } from '$lib/server/db/groups';
import type { MonitorGroup } from '$lib/types/group';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!platform?.env?.DB) {
		return {
			groups: [] as MonitorGroup[],
			user: locals.user
		};
	}

	const groups = await getAllGroups(platform.env.DB);

	return {
		groups,
		user: locals.user
	};
};
