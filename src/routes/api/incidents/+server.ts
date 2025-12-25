import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllIncidents, createIncident } from '$lib/server/db/status';
import type { CreateIncidentInput } from '$lib/types/status';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const incidents = await getAllIncidents(platform.env.DB);
	return json(incidents);
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: CreateIncidentInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.title || !input.status || !input.message || !input.group_id) {
		return json({ error: 'Title, status, message, and group_id are required' }, { status: 400 });
	}

	const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
	if (!validStatuses.includes(input.status)) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	try {
		const incident = await createIncident(platform.env.DB, input);
		return json(incident, { status: 201 });
	} catch (err) {
		console.error('Failed to create incident:', err);
		return json({ error: 'Failed to create incident' }, { status: 500 });
	}
};
