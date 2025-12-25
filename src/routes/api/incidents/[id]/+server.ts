import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIncidentById, addIncidentUpdate, deleteIncident } from '$lib/server/db/status';
import type { AddIncidentUpdateInput } from '$lib/types/status';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const incident = await getIncidentById(platform.env.DB, params.id);
	if (!incident) {
		return json({ error: 'Incident not found' }, { status: 404 });
	}

	return json(incident);
};

// POST to add an update to an incident
export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const incident = await getIncidentById(platform.env.DB, params.id);
	if (!incident) {
		return json({ error: 'Incident not found' }, { status: 404 });
	}

	let input: AddIncidentUpdateInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.status || !input.message) {
		return json({ error: 'Status and message are required' }, { status: 400 });
	}

	const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
	if (!validStatuses.includes(input.status)) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	try {
		const update = await addIncidentUpdate(platform.env.DB, params.id, input);
		return json(update, { status: 201 });
	} catch (err) {
		console.error('Failed to add incident update:', err);
		return json({ error: 'Failed to add update' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const incident = await getIncidentById(platform.env.DB, params.id);
	if (!incident) {
		return json({ error: 'Incident not found' }, { status: 404 });
	}

	try {
		await deleteIncident(platform.env.DB, params.id);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete incident:', err);
		return json({ error: 'Failed to delete incident' }, { status: 500 });
	}
};
