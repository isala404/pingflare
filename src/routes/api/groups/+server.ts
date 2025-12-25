import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllGroups, createGroup } from '$lib/server/db/groups';
import type { CreateGroupInput } from '$lib/types/group';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const groups = await getAllGroups(platform.env.DB);
	return json(groups);
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	let input: CreateGroupInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name?.trim()) {
		return json({ error: 'Group name is required' }, { status: 400 });
	}

	try {
		const group = await createGroup(platform.env.DB, {
			name: input.name.trim(),
			slug: input.slug?.trim(),
			description: input.description?.trim(),
			is_public: input.is_public
		});
		return json(group, { status: 201 });
	} catch (err) {
		console.error('Failed to create group:', err);
		return json({ error: 'Failed to create group' }, { status: 500 });
	}
};
