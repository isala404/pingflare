import type { StatusCacheEntry, MonitorStatus } from '$lib/types/monitor';

const CACHE_PREFIX = 'status:';
const ALL_STATUS_KEY = 'all_status';

export async function updateMonitorStatus(
	kv: KVNamespace,
	monitorId: string,
	status: MonitorStatus,
	responseTimeMs: number | null,
	uptime24h: number
): Promise<void> {
	const entry: StatusCacheEntry = {
		monitor_id: monitorId,
		status,
		response_time_ms: responseTimeMs,
		checked_at: new Date().toISOString(),
		uptime_24h: uptime24h
	};

	await kv.put(`${CACHE_PREFIX}${monitorId}`, JSON.stringify(entry), {
		expirationTtl: 300 // 5 minutes TTL
	});
}

export async function getMonitorStatus(
	kv: KVNamespace,
	monitorId: string
): Promise<StatusCacheEntry | null> {
	const data = await kv.get(`${CACHE_PREFIX}${monitorId}`);
	if (!data) return null;
	return JSON.parse(data) as StatusCacheEntry;
}

export async function updateAllStatus(
	kv: KVNamespace,
	statuses: StatusCacheEntry[]
): Promise<void> {
	await kv.put(ALL_STATUS_KEY, JSON.stringify(statuses), {
		expirationTtl: 60 // 1 minute TTL for aggregated status
	});
}

export async function getAllStatus(kv: KVNamespace): Promise<StatusCacheEntry[] | null> {
	const data = await kv.get(ALL_STATUS_KEY);
	if (!data) return null;
	return JSON.parse(data) as StatusCacheEntry[];
}
