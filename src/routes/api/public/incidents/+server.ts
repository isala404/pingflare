import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecentIncidentsByDate, getActiveIncidents } from '$lib/server/db/status';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const activeOnly = url.searchParams.get('active') === 'true';
	const days = parseInt(url.searchParams.get('days') || '7', 10);

	if (activeOnly) {
		const incidents = await getActiveIncidents(platform.env.DB);
		return json(incidents);
	}

	const incidentsByDate = await getRecentIncidentsByDate(platform.env.DB, days);
	return json(incidentsByDate);
};
