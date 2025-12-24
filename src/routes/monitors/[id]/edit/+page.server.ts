import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getMonitorById, getLastCheck, getUptime24h } from '$lib/server/db/monitors';
import type { MonitorWithStatus } from '$lib/types/monitor';

export const load: PageServerLoad = async ({ params, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const monitor = await getMonitorById(db, params.id);
	if (!monitor) {
		throw error(404, 'Monitor not found');
	}

	const lastCheck = await getLastCheck(db, monitor.id);
	const uptime24h = await getUptime24h(db, monitor.id);

	const monitorWithStatus: MonitorWithStatus = {
		...monitor,
		current_status: lastCheck?.status ?? null,
		last_check: lastCheck,
		uptime_24h: uptime24h
	};

	return { monitor: monitorWithStatus };
};
