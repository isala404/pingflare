import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getGroupWithStatusBySlug } from '$lib/server/db/groups';
import type { Incident, IncidentsByDate, IncidentUpdate } from '$lib/types/status';
import type { D1Database } from '@cloudflare/workers-types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const db = platform.env.DB;
	const group = await getGroupWithStatusBySlug(db, params.slug);

	if (!group) {
		throw error(404, 'Group not found');
	}

	// Only allow public groups
	if (!group.is_public) {
		throw error(404, 'Group not found');
	}

	// Get incidents for this group
	const [activeIncidents, pastIncidents] = await Promise.all([
		getActiveIncidentsForGroup(db, group.id),
		getRecentIncidentsByDateForGroup(db, group.id, 7)
	]);

	return {
		group,
		activeIncidents,
		pastIncidents
	};
};

async function getActiveIncidentsForGroup(db: D1Database, groupId: string): Promise<Incident[]> {
	const incidents = await db
		.prepare(
			`
			SELECT i.*, g.name as group_name
			FROM incidents i
			LEFT JOIN monitor_groups g ON i.group_id = g.id
			WHERE i.status != 'resolved' AND i.group_id = ?
			ORDER BY i.created_at DESC
		`
		)
		.bind(groupId)
		.all<Incident & { group_name: string }>();

	// Fetch updates for each incident
	const result: Incident[] = [];
	for (const incident of incidents.results) {
		const updates = await db
			.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
			.bind(incident.id)
			.all<IncidentUpdate>();

		result.push({
			...incident,
			updates: updates.results
		});
	}

	return result;
}

async function getRecentIncidentsByDateForGroup(
	db: D1Database,
	groupId: string,
	days: number
): Promise<IncidentsByDate[]> {
	const result: IncidentsByDate[] = [];
	const today = new Date();

	for (let i = 0; i < days; i++) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		const dateStr = date.toISOString().split('T')[0];
		const dateFormatted = date.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});

		const incidents = await db
			.prepare(
				`
				SELECT i.*, g.name as group_name
				FROM incidents i
				LEFT JOIN monitor_groups g ON i.group_id = g.id
				WHERE date(i.created_at) = ? AND i.group_id = ?
				ORDER BY i.created_at DESC
			`
			)
			.bind(dateStr, groupId)
			.all<Incident & { group_name: string }>();

		const incidentsWithUpdates: Incident[] = [];
		for (const incident of incidents.results) {
			const updates = await db
				.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
				.bind(incident.id)
				.all<IncidentUpdate>();

			incidentsWithUpdates.push({
				...incident,
				updates: updates.results
			});
		}

		result.push({
			date: dateStr,
			dateFormatted,
			incidents: incidentsWithUpdates
		});
	}

	return result;
}
