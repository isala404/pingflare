import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllMonitors, createMonitor, getLastCheck, getUptime24h } from '$lib/server/db/monitors';
import type { CreateMonitorInput, MonitorWithStatus } from '$lib/types/monitor';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;
	const monitors = await getAllMonitors(db);

	const monitorsWithStatus: MonitorWithStatus[] = await Promise.all(
		monitors.map(async (monitor) => {
			const lastCheck = await getLastCheck(db, monitor.id);
			const uptime24h = await getUptime24h(db, monitor.id);

			return {
				...monitor,
				current_status: lastCheck?.status ?? null,
				last_check: lastCheck,
				uptime_24h: uptime24h
			};
		})
	);

	return json(monitorsWithStatus);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	let input: CreateMonitorInput;
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name || !input.type) {
		return json({ error: 'Name and type are required' }, { status: 400 });
	}

	if (!['http', 'tcp', 'dns', 'push'].includes(input.type)) {
		return json({ error: 'Invalid monitor type' }, { status: 400 });
	}

	if (input.type === 'http' && !input.url) {
		return json({ error: 'URL is required for HTTP monitors' }, { status: 400 });
	}

	if (input.type === 'tcp' && (!input.hostname || !input.port)) {
		return json({ error: 'Hostname and port are required for TCP monitors' }, { status: 400 });
	}

	try {
		const monitor = await createMonitor(db, input);
		return json(monitor, { status: 201 });
	} catch (err) {
		console.error('Failed to create monitor:', err);
		return json({ error: 'Failed to create monitor' }, { status: 500 });
	}
};
