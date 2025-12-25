import type { PageServerLoad } from './$types';
import { getAllGroups, getGroupMonitorCount } from '$lib/server/db/groups';
import type { MonitorGroup } from '$lib/types/group';

interface GroupWithCount extends MonitorGroup {
	monitor_count: number;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!platform?.env?.DB) {
		return {
			groups: [] as GroupWithCount[],
			user: locals.user
		};
	}

	const groups = await getAllGroups(platform.env.DB);

	// Get monitor count for each group
	const groupsWithCounts: GroupWithCount[] = await Promise.all(
		groups.map(async (group) => {
			const count = await getGroupMonitorCount(platform.env.DB!, group.id);
			return { ...group, monitor_count: count };
		})
	);

	return {
		groups: groupsWithCounts,
		user: locals.user
	};
};
