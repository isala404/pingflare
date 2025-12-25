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
			`INSERT INTO monitors (id, name, script, group_id, interval_seconds, timeout_ms, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.name,
			input.script,
			input.group_id,
			input.interval_seconds ?? 60,
			input.timeout_ms ?? 30000,
			input.active !== false ? 1 : 0,
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
	if (input.script !== undefined) {
		updates.push('script = ?');
		values.push(input.script);
	}
	if (input.interval_seconds !== undefined) {
		updates.push('interval_seconds = ?');
		values.push(input.interval_seconds);
	}
	if (input.timeout_ms !== undefined) {
		updates.push('timeout_ms = ?');
		values.push(input.timeout_ms);
	}
	if (input.active !== undefined) {
		updates.push('active = ?');
		values.push(input.active ? 1 : 0);
	}
	if (input.group_id !== undefined) {
		updates.push('group_id = ?');
		values.push(input.group_id);
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
