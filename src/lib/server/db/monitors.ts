import type { Monitor, CreateMonitorInput, Check, MonitorStatus } from '$lib/types/monitor';

export function generateId(): string {
	return crypto.randomUUID();
}

export async function getAllMonitors(db: D1Database): Promise<Monitor[]> {
	const result = await db.prepare('SELECT * FROM monitors ORDER BY created_at DESC').all<Monitor>();
	return result.results;
}

export async function getActiveMonitors(db: D1Database): Promise<Monitor[]> {
	const result = await db
		.prepare('SELECT * FROM monitors WHERE active = 1 ORDER BY created_at DESC')
		.all<Monitor>();
	return result.results;
}

export async function getMonitorById(db: D1Database, id: string): Promise<Monitor | null> {
	const result = await db.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first<Monitor>();
	return result;
}

export async function createMonitor(db: D1Database, input: CreateMonitorInput): Promise<Monitor> {
	const id = generateId();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO monitors (id, name, type, url, hostname, port, method, expected_status, keyword, keyword_type, interval_seconds, timeout_ms, retry_count, active, script, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.name,
			input.type,
			input.url ?? null,
			input.hostname ?? null,
			input.port ?? null,
			input.method ?? 'GET',
			input.expected_status ?? 200,
			input.keyword ?? null,
			input.keyword_type ?? null,
			input.interval_seconds ?? 60,
			input.timeout_ms ?? 30000,
			input.retry_count ?? 3,
			input.active !== false ? 1 : 0,
			input.script ?? null,
			now,
			now
		)
		.run();

	const monitor = await getMonitorById(db, id);
	if (!monitor) {
		throw new Error('Failed to create monitor');
	}
	return monitor;
}

export async function updateMonitor(
	db: D1Database,
	id: string,
	input: Partial<CreateMonitorInput>
): Promise<Monitor | null> {
	const existing = await getMonitorById(db, id);
	if (!existing) {
		return null;
	}

	const now = new Date().toISOString();
	const updates: string[] = [];
	const values: (string | number | null)[] = [];

	if (input.name !== undefined) {
		updates.push('name = ?');
		values.push(input.name);
	}
	if (input.type !== undefined) {
		updates.push('type = ?');
		values.push(input.type);
	}
	if (input.url !== undefined) {
		updates.push('url = ?');
		values.push(input.url);
	}
	if (input.hostname !== undefined) {
		updates.push('hostname = ?');
		values.push(input.hostname);
	}
	if (input.port !== undefined) {
		updates.push('port = ?');
		values.push(input.port);
	}
	if (input.method !== undefined) {
		updates.push('method = ?');
		values.push(input.method);
	}
	if (input.expected_status !== undefined) {
		updates.push('expected_status = ?');
		values.push(input.expected_status);
	}
	if (input.keyword !== undefined) {
		updates.push('keyword = ?');
		values.push(input.keyword);
	}
	if (input.keyword_type !== undefined) {
		updates.push('keyword_type = ?');
		values.push(input.keyword_type);
	}
	if (input.interval_seconds !== undefined) {
		updates.push('interval_seconds = ?');
		values.push(input.interval_seconds);
	}
	if (input.timeout_ms !== undefined) {
		updates.push('timeout_ms = ?');
		values.push(input.timeout_ms);
	}
	if (input.retry_count !== undefined) {
		updates.push('retry_count = ?');
		values.push(input.retry_count);
	}
	if (input.active !== undefined) {
		updates.push('active = ?');
		values.push(input.active ? 1 : 0);
	}
	if (input.script !== undefined) {
		updates.push('script = ?');
		values.push(input.script);
	}

	updates.push('updated_at = ?');
	values.push(now);
	values.push(id);

	await db
		.prepare(`UPDATE monitors SET ${updates.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return getMonitorById(db, id);
}

export async function deleteMonitor(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM monitors WHERE id = ?').bind(id).run();
	return result.meta.changes > 0;
}

export async function insertCheck(
	db: D1Database,
	monitorId: string,
	status: MonitorStatus,
	responseTimeMs: number | null,
	statusCode: number | null,
	errorMessage: string | null,
	checkedFrom: string | null
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO checks (monitor_id, status, response_time_ms, status_code, error_message, checked_from)
       VALUES (?, ?, ?, ?, ?, ?)`
		)
		.bind(monitorId, status, responseTimeMs, statusCode, errorMessage, checkedFrom)
		.run();
}

export async function getRecentChecks(
	db: D1Database,
	monitorId: string,
	limit: number = 100
): Promise<Check[]> {
	const result = await db
		.prepare('SELECT * FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?')
		.bind(monitorId, limit)
		.all<Check>();
	return result.results;
}

export async function getLastCheck(db: D1Database, monitorId: string): Promise<Check | null> {
	return db
		.prepare('SELECT * FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 1')
		.bind(monitorId)
		.first<Check>();
}

export async function getUptime24h(db: D1Database, monitorId: string): Promise<number> {
	const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const total = await db
		.prepare('SELECT COUNT(*) as count FROM checks WHERE monitor_id = ? AND checked_at > ?')
		.bind(monitorId, twentyFourHoursAgo)
		.first<{ count: number }>();

	const up = await db
		.prepare(
			"SELECT COUNT(*) as count FROM checks WHERE monitor_id = ? AND checked_at > ? AND status = 'up'"
		)
		.bind(monitorId, twentyFourHoursAgo)
		.first<{ count: number }>();

	if (!total?.count || total.count === 0) {
		return 100;
	}

	return Math.round(((up?.count ?? 0) / total.count) * 10000) / 100;
}

export async function cleanupOldChecks(db: D1Database, retentionDays: number = 7): Promise<number> {
	const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
	const result = await db.prepare('DELETE FROM checks WHERE checked_at < ?').bind(cutoff).run();
	return result.meta.changes;
}
