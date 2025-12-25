import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllMonitors, createMonitor, getLastCheck, getUptime24h } from '$lib/server/db/monitors';
import { setMonitorNotifications } from '$lib/server/db/notifications';
import type { CreateMonitorInput, MonitorWithStatus } from '$lib/types/monitor';
import type { MonitorNotificationInput } from '$lib/types/notification';
import { validateScript } from '$lib/server/checkers/script';

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	let input: CreateMonitorInput & { notifications?: MonitorNotificationInput[] };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!input.name) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	if (!input.script) {
		return json({ error: 'Script is required' }, { status: 400 });
	}

	const validation = validateScript(input.script);
	if (!validation.valid) {
		return json({ error: validation.error }, { status: 400 });
	}

	try {
		const { notifications, ...monitorInput } = input;
		const monitor = await createMonitor(db, monitorInput);

		if (notifications && notifications.length > 0) {
			await setMonitorNotifications(db, monitor.id, notifications);
		}

		return json(monitor, { status: 201 });
	} catch (err) {
		console.error('Failed to create monitor:', err);
		return json({ error: 'Failed to create monitor' }, { status: 500 });
	}
};
