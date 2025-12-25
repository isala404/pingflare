import type { D1Database } from '@cloudflare/workers-types';
import type { Monitor, Check, MonitorStatus } from '$lib/types/monitor';
import type {
	DailyStatus,
	StatusMonitor,
	Incident,
	IncidentUpdate,
	IncidentsByDate,
	CreateIncidentInput,
	AddIncidentUpdateInput
} from '$lib/types/status';

// ============================================
// Monitor Status Functions
// ============================================

/**
 * Get last check for a monitor
 */
export async function getLastCheck(db: D1Database, monitorId: string): Promise<Check | null> {
	return db
		.prepare('SELECT * FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 1')
		.bind(monitorId)
		.first<Check>();
}

/**
 * Get 90-day daily status for a monitor
 */
export async function getDailyStatus(db: D1Database, monitorId: string): Promise<DailyStatus[]> {
	const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Get aggregated daily data
	const dailyData = await db
		.prepare(
			`
			SELECT date, total_checks, up_checks, down_checks, degraded_checks, downtime_minutes
			FROM daily_status
			WHERE monitor_id = ? AND date >= ?
			ORDER BY date ASC
		`
		)
		.bind(monitorId, cutoff)
		.all<{
			date: string;
			total_checks: number;
			up_checks: number;
			down_checks: number;
			degraded_checks: number;
			downtime_minutes: number;
		}>();

	// Also get raw checks for recent days not yet aggregated
	const rawChecks = await db
		.prepare(
			`
			SELECT
				DATE(checked_at) as date,
				COUNT(*) as total_checks,
				SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks,
				SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_checks,
				SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_checks
			FROM checks
			WHERE monitor_id = ? AND DATE(checked_at) >= ?
			GROUP BY DATE(checked_at)
			ORDER BY date ASC
		`
		)
		.bind(monitorId, cutoff)
		.all<{
			date: string;
			total_checks: number;
			up_checks: number;
			down_checks: number;
			degraded_checks: number;
		}>();

	// Build a map of dates to status
	const statusMap = new Map<string, DailyStatus>();

	// Initialize all 90 days with 'none' status
	for (let i = 89; i >= 0; i--) {
		const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
		const dateStr = date.toISOString().split('T')[0];
		statusMap.set(dateStr, { date: dateStr, status: 'none', downtime_minutes: 0 });
	}

	// Fill in aggregated data
	for (const row of dailyData.results) {
		if (row.total_checks === 0) continue;
		let status: DailyStatus['status'] = 'up';
		if (row.down_checks > 0) status = 'down';
		else if (row.degraded_checks > 0) status = 'degraded';
		statusMap.set(row.date, {
			date: row.date,
			status,
			downtime_minutes: row.downtime_minutes || 0
		});
	}

	// Overlay raw checks (more recent data)
	for (const row of rawChecks.results) {
		if (row.total_checks === 0) continue;
		let status: DailyStatus['status'] = 'up';
		if (row.down_checks > 0) status = 'down';
		else if (row.degraded_checks > 0) status = 'degraded';
		// Estimate downtime (rough calculation)
		const downtimeMinutes = Math.round((row.down_checks / row.total_checks) * 24 * 60);
		statusMap.set(row.date, { date: row.date, status, downtime_minutes: downtimeMinutes });
	}

	// Return sorted array
	return Array.from(statusMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate 90-day uptime percentage
 */
export async function getUptime90d(db: D1Database, monitorId: string): Promise<number> {
	const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

	const result = await db
		.prepare(
			`
			SELECT
				COUNT(*) as total,
				SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up
			FROM checks
			WHERE monitor_id = ? AND checked_at > ?
		`
		)
		.bind(monitorId, cutoff)
		.first<{ total: number; up: number }>();

	if (!result?.total || result.total === 0) return 100;
	return Math.round((result.up / result.total) * 10000) / 100;
}

/**
 * Get all monitors with status data (for admin)
 */
export async function getAllMonitorsForStatusPage(db: D1Database): Promise<StatusMonitor[]> {
	const monitors = await db.prepare('SELECT * FROM monitors ORDER BY name ASC').all<Monitor>();

	const statusMonitors: StatusMonitor[] = await Promise.all(
		monitors.results.map(async (monitor) => {
			const [lastCheck, dailyStatus, uptime90d] = await Promise.all([
				getLastCheck(db, monitor.id),
				getDailyStatus(db, monitor.id),
				getUptime90d(db, monitor.id)
			]);

			return {
				id: monitor.id,
				name: monitor.name,
				group_id: monitor.group_id,
				current_status: lastCheck?.status ?? null,
				uptime_90d: uptime90d,
				daily_status: dailyStatus
			};
		})
	);

	return statusMonitors;
}

/**
 * Get effective status for dashboard display
 * Returns 'down' only if last 5 consecutive minutes worth of checks are down
 */
export async function getEffectiveStatus(
	db: D1Database,
	monitorId: string,
	intervalSeconds: number
): Promise<MonitorStatus | null> {
	// Calculate how many checks in 5 minutes
	const checksIn5Min = Math.max(1, Math.ceil(300 / intervalSeconds));

	const recentChecks = await db
		.prepare(
			`
			SELECT status FROM checks
			WHERE monitor_id = ?
			ORDER BY checked_at DESC
			LIMIT ?
		`
		)
		.bind(monitorId, checksIn5Min)
		.all<{ status: MonitorStatus }>();

	if (recentChecks.results.length === 0) return null;

	// If all recent checks are 'down', return 'down'
	const allDown = recentChecks.results.every((c) => c.status === 'down');
	if (allDown && recentChecks.results.length >= checksIn5Min) {
		return 'down';
	}

	// Otherwise return the most recent status (but treat single failure as still up)
	const mostRecent = recentChecks.results[0].status;
	if (mostRecent === 'down') {
		// Not enough consecutive failures, show as degraded
		return 'degraded';
	}
	return mostRecent;
}

/**
 * Aggregate daily status from raw checks (run once per day)
 */
export async function aggregateDailyStatus(db: D1Database): Promise<void> {
	// Get yesterday's date
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const dateStr = yesterday.toISOString().split('T')[0];

	// Aggregate for each monitor
	const aggregates = await db
		.prepare(
			`
			SELECT
				monitor_id,
				COUNT(*) as total_checks,
				SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks,
				SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_checks,
				SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded_checks
			FROM checks
			WHERE DATE(checked_at) = ?
			GROUP BY monitor_id
		`
		)
		.bind(dateStr)
		.all<{
			monitor_id: string;
			total_checks: number;
			up_checks: number;
			down_checks: number;
			degraded_checks: number;
		}>();

	for (const agg of aggregates.results) {
		const downtimeMinutes = Math.round((agg.down_checks / agg.total_checks) * 24 * 60);

		await db
			.prepare(
				`
				INSERT INTO daily_status (monitor_id, date, total_checks, up_checks, down_checks, degraded_checks, downtime_minutes)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(monitor_id, date) DO UPDATE SET
					total_checks = excluded.total_checks,
					up_checks = excluded.up_checks,
					down_checks = excluded.down_checks,
					degraded_checks = excluded.degraded_checks,
					downtime_minutes = excluded.downtime_minutes
			`
			)
			.bind(
				agg.monitor_id,
				dateStr,
				agg.total_checks,
				agg.up_checks,
				agg.down_checks,
				agg.degraded_checks,
				downtimeMinutes
			)
			.run();
	}
}

// ============================================
// Incident Functions
// ============================================

/**
 * Get all incidents with their updates and group names
 */
export async function getAllIncidents(db: D1Database): Promise<Incident[]> {
	const incidents = await db
		.prepare(
			`
			SELECT i.*, g.name as group_name
			FROM incidents i
			LEFT JOIN monitor_groups g ON i.group_id = g.id
			ORDER BY i.created_at DESC
		`
		)
		.all<Omit<Incident, 'updates'>>();

	const incidentsWithUpdates: Incident[] = await Promise.all(
		incidents.results.map(async (incident) => {
			const updates = await db
				.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
				.bind(incident.id)
				.all<IncidentUpdate>();

			return { ...incident, updates: updates.results };
		})
	);

	return incidentsWithUpdates;
}

/**
 * Get active (unresolved) incidents with group names
 */
export async function getActiveIncidents(db: D1Database): Promise<Incident[]> {
	const incidents = await db
		.prepare(
			`
			SELECT i.*, g.name as group_name
			FROM incidents i
			LEFT JOIN monitor_groups g ON i.group_id = g.id
			WHERE i.status != 'resolved'
			ORDER BY i.created_at DESC
		`
		)
		.all<Omit<Incident, 'updates'>>();

	const incidentsWithUpdates: Incident[] = await Promise.all(
		incidents.results.map(async (incident) => {
			const updates = await db
				.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
				.bind(incident.id)
				.all<IncidentUpdate>();

			return { ...incident, updates: updates.results };
		})
	);

	return incidentsWithUpdates;
}

/**
 * Get recent incidents (past 7 days) grouped by date with group names
 */
export async function getRecentIncidentsByDate(
	db: D1Database,
	days: number = 7
): Promise<IncidentsByDate[]> {
	const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

	const incidents = await db
		.prepare(
			`
			SELECT i.*, g.name as group_name
			FROM incidents i
			LEFT JOIN monitor_groups g ON i.group_id = g.id
			WHERE i.created_at > ?
			ORDER BY i.created_at DESC
		`
		)
		.bind(cutoff)
		.all<Omit<Incident, 'updates'>>();

	// Get updates for all incidents
	const incidentsWithUpdates: Incident[] = await Promise.all(
		incidents.results.map(async (incident) => {
			const updates = await db
				.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
				.bind(incident.id)
				.all<IncidentUpdate>();

			return { ...incident, updates: updates.results };
		})
	);

	// Group by date
	const byDateMap = new Map<string, Incident[]>();

	// Initialize all days
	for (let i = 0; i < days; i++) {
		const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
		const dateStr = date.toISOString().split('T')[0];
		byDateMap.set(dateStr, []);
	}

	// Group incidents
	for (const incident of incidentsWithUpdates) {
		const dateStr = incident.created_at.split('T')[0];
		const existing = byDateMap.get(dateStr) || [];
		existing.push(incident);
		byDateMap.set(dateStr, existing);
	}

	// Convert to array
	const result: IncidentsByDate[] = [];
	for (const [date, incidents] of byDateMap) {
		const d = new Date(date);
		result.push({
			date,
			dateFormatted: d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			}),
			incidents
		});
	}

	return result.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get a single incident by ID
 */
export async function getIncidentById(db: D1Database, id: string): Promise<Incident | null> {
	const incident = await db
		.prepare('SELECT * FROM incidents WHERE id = ?')
		.bind(id)
		.first<Omit<Incident, 'updates'>>();

	if (!incident) return null;

	const updates = await db
		.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC')
		.bind(id)
		.all<IncidentUpdate>();

	return { ...incident, updates: updates.results };
}

/**
 * Create a new incident with initial update
 */
export async function createIncident(
	db: D1Database,
	input: CreateIncidentInput
): Promise<Incident> {
	const incidentId = crypto.randomUUID();
	const updateId = crypto.randomUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			'INSERT INTO incidents (id, title, status, group_id, created_at) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(incidentId, input.title, input.status, input.group_id, now)
		.run();

	await db
		.prepare(
			'INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(updateId, incidentId, input.status, input.message, now)
		.run();

	// Get group name
	const group = await db
		.prepare('SELECT name FROM monitor_groups WHERE id = ?')
		.bind(input.group_id)
		.first<{ name: string }>();

	return {
		id: incidentId,
		title: input.title,
		status: input.status,
		group_id: input.group_id,
		group_name: group?.name,
		created_at: now,
		resolved_at: null,
		updates: [
			{
				id: updateId,
				incident_id: incidentId,
				status: input.status,
				message: input.message,
				created_at: now
			}
		]
	};
}

/**
 * Add an update to an incident
 */
export async function addIncidentUpdate(
	db: D1Database,
	incidentId: string,
	input: AddIncidentUpdateInput
): Promise<IncidentUpdate> {
	const updateId = crypto.randomUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			'INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(updateId, incidentId, input.status, input.message, now)
		.run();

	// Update incident status
	const resolvedAt = input.status === 'resolved' ? now : null;
	await db
		.prepare('UPDATE incidents SET status = ?, resolved_at = COALESCE(?, resolved_at) WHERE id = ?')
		.bind(input.status, resolvedAt, incidentId)
		.run();

	return {
		id: updateId,
		incident_id: incidentId,
		status: input.status,
		message: input.message,
		created_at: now
	};
}

/**
 * Delete an incident
 */
export async function deleteIncident(db: D1Database, id: string): Promise<void> {
	await db.prepare('DELETE FROM incidents WHERE id = ?').bind(id).run();
}

/**
 * Clean up old daily status records (keep N days)
 */
export async function cleanupOldDailyStatus(db: D1Database, keepDays: number): Promise<void> {
	const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
	await db.prepare('DELETE FROM daily_status WHERE date < ?').bind(cutoff).run();
}
