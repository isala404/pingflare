import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getGroupById,
	updateGroup,
	deleteGroup,
	getGroupMonitorCount
} from '$lib/server/db/groups';
import type { UpdateGroupInput } from '$lib/types/group';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const group = await getGroupById(platform.env.DB, params.id);
	if (!group) {
		return json({ error: 'Group not found' }, { status: 404 });
	}

	const monitorCount = await getGroupMonitorCount(platform.env.DB, params.id);

	return json({ ...group, monitor_count: monitorCount });
};

export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const group = await getGroupById(platform.env.DB, params.id);
	if (!group) {
		return json({ error: 'Group not found' }, { status: 404 });
	}

	let input: UpdateGroupInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		await updateGroup(platform.env.DB, params.id, input);
		const updated = await getGroupById(platform.env.DB, params.id);
		return json(updated);
	} catch (err) {
		console.error('Failed to update group:', err);
		return json({ error: 'Failed to update group' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const group = await getGroupById(platform.env.DB, params.id);
	if (!group) {
		return json({ error: 'Group not found' }, { status: 404 });
	}

	const result = await deleteGroup(platform.env.DB, params.id);
	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true });
};
