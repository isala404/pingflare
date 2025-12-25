import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getMonitorById,
	updateMonitor,
	deleteMonitor,
	getLastCheck,
	getUptime24h,
	getRecentChecks
} from '$lib/server/db/monitors';
import { setMonitorNotifications } from '$lib/server/db/notifications';
import type { CreateMonitorInput, MonitorWithStatus } from '$lib/types/monitor';
import type { MonitorNotificationInput } from '$lib/types/notification';
import { validateScript } from '$lib/server/checkers/script';

export const GET: RequestHandler = async ({ params, platform, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;
	const monitor = await getMonitorById(db, params.id);

	if (!monitor) {
		return json({ error: 'Monitor not found' }, { status: 404 });
	}

	const lastCheck = await getLastCheck(db, monitor.id);
	const uptime24h = await getUptime24h(db, monitor.id);

	const includeChecks = url.searchParams.get('checks') === 'true';
	const checksLimit = parseInt(url.searchParams.get('limit') || '100', 10);

	const result: MonitorWithStatus & { checks?: unknown[] } = {
		...monitor,
		current_status: lastCheck?.status ?? null,
		last_check: lastCheck,
		uptime_24h: uptime24h
	};

	if (includeChecks) {
		result.checks = await getRecentChecks(db, monitor.id, checksLimit);
	}

	return json(result);
};

export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	let input: Partial<CreateMonitorInput> & { notifications?: MonitorNotificationInput[] };
	try {
		input = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (input.script !== undefined) {
		const validation = validateScript(input.script);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}
	}

	try {
		const { notifications, ...monitorInput } = input;
		const monitor = await updateMonitor(db, params.id, monitorInput);

		if (!monitor) {
			return json({ error: 'Monitor not found' }, { status: 404 });
		}

		if (notifications !== undefined) {
			await setMonitorNotifications(db, params.id, notifications);
		}

		return json(monitor);
	} catch (err) {
		console.error('Failed to update monitor:', err);
		return json({ error: 'Failed to update monitor' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const db = platform.env.DB;

	try {
		const deleted = await deleteMonitor(db, params.id);

		if (!deleted) {
			return json({ error: 'Monitor not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete monitor:', err);
		return json({ error: 'Failed to delete monitor' }, { status: 500 });
	}
};
